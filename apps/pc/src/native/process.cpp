#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <tchar.h>
#include <string>
#include <iostream>
#include "process.h"

bool EnumerateProcesses(const ProcessCallback& callback) {
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap == INVALID_HANDLE_VALUE) return false;

    PROCESSENTRY32W pe;
    pe.dwSize = sizeof(pe);

    bool success = true;
    if (Process32FirstW(snap, &pe)) {
        do {
            if (!callback(pe)) {
                break; // 回调返回false，停止遍历
            }
        } while (Process32NextW(snap, &pe));
    } else {
        success = false;
    }

    CloseHandle(snap);
    return success;
}

uint32_t FindPidByName(const std::wstring& exeName) {
    uint32_t foundPid = 0;

    EnumerateProcesses([&](const PROCESSENTRY32W& pe) -> bool {
        if (exeName == pe.szExeFile) {
            foundPid = pe.th32ProcessID;
            return false; // 找到了，停止遍历
        }
        return true; // 继续遍历
    });

    return foundPid;
}

uint32_t OpenProcessByPid(uint32_t pid, HANDLE& outHandle, uint32_t access) {
    HANDLE h = OpenProcess(access, FALSE, pid);
    if (!h) {
        outHandle = nullptr;
        return 0;
    }
    outHandle = h;
    return pid;
}

uint32_t OpenProcessByName(const std::wstring& exeName, HANDLE& outHandle, uint32_t access) {
    uint32_t pid = FindPidByName(exeName);
    if (!pid) {
        outHandle = nullptr;
        return 0;
    }
    return OpenProcessByPid(pid, outHandle, access);
}

bool IsRunning(const std::wstring& targetExeName, const std::wstring& targetExePath) {
    bool found = false;

    EnumerateProcesses([&](const PROCESSENTRY32W& pe32) -> bool {
        // 先对比进程名
        if (_wcsicmp(pe32.szExeFile, targetExeName.c_str()) == 0) {
            // 打开进程
            HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pe32.th32ProcessID);
            if (hProcess) {
                wchar_t exePath[MAX_PATH];
                DWORD size = MAX_PATH;
                if (QueryFullProcessImageNameW(hProcess, 0, exePath, &size)) {
                    std::wstring runningPath(exePath);
                    // 校验路径是否一致
                    if (_wcsicmp(runningPath.c_str(), targetExePath.c_str()) == 0) {
                        found = true;
                        CloseHandle(hProcess);
                        return false; // 找到目标进程，停止遍历
                    }
                }
                CloseHandle(hProcess);
            }
        }
        return true; // 继续遍历
    });

    return found;
}
