#include "memory.h"
#include <TlHelp32.h>
#include <iostream>

IMemory::IMemory() : hProcess(nullptr), processId(0), nextLockId(1) {}
IMemory::~IMemory() { CloseProcess(); }

uint32_t IMemory::OpenProcessByPid(uint32_t pid, uint32_t access) {
    CloseProcess();
    HANDLE h = nullptr;
    uint32_t result = ::OpenProcessByPid(pid, h, access);
    if (result != 0) {
        hProcess = h;
        processId = pid;
        return processId;
    }
    return 0;
}

uint32_t IMemory::OpenProcessByName(const std::wstring& exeName, uint32_t access) {
    CloseProcess();
    HANDLE h = nullptr;
    uint32_t pid = ::OpenProcessByName(exeName, h, access);
    if (pid != 0) {
        hProcess = h;
        processId = pid;
        return processId;
    }
    return 0;
}

void IMemory::CloseProcess() {
    std::lock_guard<std::mutex> g(lockMutex);
    // 停止所有锁线程
    for (auto &kv : locks) {
        kv.second->active = false;
        if (kv.second->th.joinable()) kv.second->th.join();
    }
    locks.clear();

    if (hProcess) {
        CloseHandle(hProcess);
        hProcess = nullptr;
        processId = 0;
    }
}

uintptr_t IMemory::GetModuleBaseAddress(const std::wstring& moduleName) {
    if (!processId) return 0;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, processId);
    if (snap == INVALID_HANDLE_VALUE) return 0;
    MODULEENTRY32W me; me.dwSize = sizeof(me);
    uintptr_t base = 0;
    if (Module32FirstW(snap, &me)) {
        do {
            if (moduleName == me.szModule) {
                base = reinterpret_cast<uintptr_t>(me.modBaseAddr);
                break;
            }
        } while (Module32NextW(snap, &me));
    }
    CloseHandle(snap);
    return base;
}

bool IMemory::ResolvePointerPath(uintptr_t baseAddr, const std::vector<uint64_t>& offsets, uintptr_t &outAddr) {
    uintptr_t addr = baseAddr;
    // 如果 offsets 为空则直接返回 base
    if (offsets.empty()) { outAddr = addr; return true; }
    
    // 按照正确的指针链解析逻辑：先读取内存值，再加上偏移
    for (size_t i = 0; i < offsets.size(); ++i) {
        // 先读取当前地址的值
        uintptr_t temp = 0;
        if (!ReadMemory(addr, &temp, sizeof(temp))) return false;
        // 然后加上偏移得到下一个地址
        addr = temp + static_cast<uintptr_t>(offsets[i]);
    }
    outAddr = addr;
    return true;
}

bool IMemory::ReadMemory(uintptr_t address, void* buffer, SIZE_T size) {
    if (!hProcess) return false;
    SIZE_T out = 0;
    BOOL ok = ReadProcessMemory(hProcess, reinterpret_cast<LPCVOID>(address), buffer, size, &out);
    return ok && out == size;
}

bool IMemory::WriteMemory(uintptr_t address, const void* buffer, SIZE_T size) {
    if (!hProcess) return false;
    DWORD oldProtect = 0;
    // 先尝试修改保护
    if (VirtualProtectEx(hProcess, reinterpret_cast<LPVOID>(address), size, PAGE_EXECUTE_READWRITE, &oldProtect)) {
        SIZE_T out = 0;
        BOOL ok = WriteProcessMemory(hProcess, reinterpret_cast<LPVOID>(address), buffer, size, &out);
        // 恢复保护
        VirtualProtectEx(hProcess, reinterpret_cast<LPVOID>(address), size, oldProtect, &oldProtect);
        return ok && out == size;
    } else {
        SIZE_T out = 0;
        BOOL ok = WriteProcessMemory(hProcess, reinterpret_cast<LPVOID>(address), buffer, size, &out);
        return ok && out == size;
    }
}

bool IMemory::ReadBytes(uintptr_t address, std::vector<uint8_t>& out, SIZE_T size) {
    out.resize(size);
    return ReadMemory(address, out.data(), size);
}

bool IMemory::WriteBytes(uintptr_t address, const uint8_t* data, SIZE_T size) {
    return WriteMemory(address, data, size);
}

int IMemory::LockMemory(uintptr_t address, const std::vector<uint8_t>& data, SIZE_T size, int frequency_ms) {
    if (!hProcess) return -1;
    auto entry = std::make_shared<LockEntry>();
    entry->active = true;
    entry->addr = address;
    entry->data = data;
    entry->size = size;
    entry->freq_ms = frequency_ms > 0 ? frequency_ms : 200;
    int id = nextLockId.fetch_add(1);
    entry->th = std::thread([this, entry]() {
        while (entry->active) {
            this->WriteMemory(entry->addr, entry->data.data(), entry->size);
            std::this_thread::sleep_for(std::chrono::milliseconds(entry->freq_ms));
        }
    });
    {
        std::lock_guard<std::mutex> g(lockMutex);
        locks[id] = entry;
    }
    return id;
}

bool IMemory::UnlockMemory(int lockId) {
    std::shared_ptr<LockEntry> entry;
    {
        std::lock_guard<std::mutex> g(lockMutex);
        auto it = locks.find(lockId);
        if (it == locks.end()) return false;
        entry = it->second;
        locks.erase(it);
    }
    if (entry) {
        entry->active = false;
        if (entry->th.joinable()) entry->th.join();
    }
    return true;
}

bool IMemory::InjectShellcode(const std::vector<uint8_t>& shellcode, uintptr_t &remote_addr, HANDLE &remote_thread) {
    if (!hProcess) return false;
    SIZE_T size = shellcode.size();
    LPVOID alloc = VirtualAllocEx(hProcess, nullptr, size, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    if (!alloc) return false;
    SIZE_T written = 0;
    if (!WriteProcessMemory(hProcess, alloc, shellcode.data(), size, &written) || written != size) {
        VirtualFreeEx(hProcess, alloc, 0, MEM_RELEASE);
        return false;
    }
    HANDLE th = CreateRemoteThread(hProcess, nullptr, 0, reinterpret_cast<LPTHREAD_START_ROUTINE>(alloc), nullptr, 0, nullptr);
    if (!th) {
        VirtualFreeEx(hProcess, alloc, 0, MEM_RELEASE);
        return false;
    }
    remote_addr = reinterpret_cast<uintptr_t>(alloc);
    remote_thread = th;
    return true;
}
