#pragma once
#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <unordered_map>
#include <mutex>
#include <memory>
#include "process.h"

class IMemory {
public:
    IMemory();
    ~IMemory();

    // 打开/关闭
    uint32_t OpenProcessByPid(uint32_t pid, uint32_t access = PROCESS_ALL_ACCESS);
    uint32_t OpenProcessByName(const std::wstring& exeName, uint32_t access = PROCESS_ALL_ACCESS);
    void CloseProcess();

    // 模块基址
    uintptr_t GetModuleBaseAddress(const std::wstring& moduleName);

    // pointer resolving: baseAddr + offsets
    bool ResolvePointerPath(uintptr_t baseAddr, const std::vector<uint64_t>& offsets, uintptr_t &outAddr);

    // 读写基础
    bool ReadMemory(uintptr_t address, void* buffer, SIZE_T size);
    bool WriteMemory(uintptr_t address, const void* buffer, SIZE_T size);

    // Typed helpers (implemented inline in header to avoid template ODR issues)
    template<typename T>
    bool ReadTyped(uintptr_t address, T &out) {
        return ReadMemory(address, &out, sizeof(T));
    }

    template<typename T>
    bool WriteTyped(uintptr_t address, const T &in) {
        return WriteMemory(address, &in, sizeof(T));
    }

    // 字节数组读写
    bool ReadBytes(uintptr_t address, std::vector<uint8_t>& out, SIZE_T size);
    bool WriteBytes(uintptr_t address, const uint8_t* data, SIZE_T size);

    // 锁定（周期写回），返回 lockId (>0) 成功，<=0 失败
    int LockMemory(uintptr_t address, const std::vector<uint8_t>& data, SIZE_T size, int frequency_ms);
    bool UnlockMemory(int lockId);

    // 注入 shellcode（把 shellcode 写入远程并创建线程）
    bool InjectShellcode(const std::vector<uint8_t>& shellcode, uintptr_t &remote_addr, HANDLE &remote_thread);

private:
    HANDLE hProcess;
    uint32_t processId;
    std::mutex lockMutex;

    struct LockEntry {
        std::atomic<bool> active;
        uintptr_t addr;
        std::vector<uint8_t> data;
        SIZE_T size;
        int freq_ms;
        std::thread th;
    };

    std::unordered_map<int, std::shared_ptr<LockEntry>> locks;
    std::atomic<int> nextLockId;
};
