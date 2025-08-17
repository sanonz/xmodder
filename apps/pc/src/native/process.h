#pragma once
#include <string>
#include <windows.h>
#include <functional>
#include <TlHelp32.h>

/**
 * 进程遍历回调函数类型
 * @param pe32 进程信息结构体
 * @return 返回true继续遍历，返回false停止遍历
 */
using ProcessCallback = std::function<bool(const PROCESSENTRY32W& pe32)>;

/**
 * 遍历所有进程并对每个进程执行回调函数
 * @param callback 对每个进程执行的回调函数
 * @return 成功返回true，失败返回false
 */
bool EnumerateProcesses(const ProcessCallback& callback);

/**
 * 检查指定名称和路径的进程是否正在运行
 * @param targetExeName 目标进程的可执行文件名（如 "notepad.exe"）
 * @param targetExePath 目标进程的完整路径
 * @return 如果进程正在运行且路径匹配则返回 true，否则返回 false
 */
bool IsRunning(const std::wstring& targetExeName, const std::wstring& targetExePath);

/**
 * 根据进程名查找进程ID
 * @param exeName 进程可执行文件名
 * @return 进程ID，如果未找到返回0
 */
uint32_t FindPidByName(const std::wstring& exeName);

/**
 * 根据进程ID打开进程
 * @param pid 进程ID
 * @param access 访问权限，默认为PROCESS_ALL_ACCESS
 * @return 成功返回进程ID，失败返回0，并将进程句柄存储在outHandle中
 */
uint32_t OpenProcessByPid(uint32_t pid, HANDLE& outHandle, uint32_t access = PROCESS_ALL_ACCESS);

/**
 * 根据进程名打开进程
 * @param exeName 进程可执行文件名
 * @param outHandle 输出参数，存储进程句柄
 * @param access 访问权限，默认为PROCESS_ALL_ACCESS
 * @return 成功返回进程ID，失败返回0
 */
uint32_t OpenProcessByName(const std::wstring& exeName, HANDLE& outHandle, uint32_t access = PROCESS_ALL_ACCESS);
