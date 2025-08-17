#include <napi.h>
#include "memory.h"
#include "process.h"
#include "helper.h"
#include <vector>
#include <string>

static IMemory imem;

// open by pid
Napi::Boolean OpenByPid(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return Napi::Boolean::New(env, false);
    uint32_t pid = info[0].As<Napi::Number>().Uint32Value();
    bool ok = imem.OpenProcessByPid(pid);
    return Napi::Boolean::New(env, ok);
}

// open by exe name
Napi::Number OpenByName(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return Napi::Number::New(env, 0);
    std::string name = info[0].As<Napi::String>().Utf8Value();
    std::wstring wname = Utf8ToWstring(name);
    uint32_t pid = imem.OpenProcessByName(wname);
    return Napi::Number::New(env, pid);
}

Napi::Boolean CloseProc(const Napi::CallbackInfo& info) {
    imem.CloseProcess();
    return Napi::Boolean::New(info.Env(), true);
}

// get module base
Napi::Value GetModuleBase(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return env.Null();
    std::string modName = info[0].As<Napi::String>().Utf8Value();
    std::wstring wmod = Utf8ToWstring(modName);
    uintptr_t base = imem.GetModuleBaseAddress(wmod);
    // return BigInt
    return Napi::BigInt::New(env, static_cast<uint64_t>(base));
}

// resolve pointer: ["base.dll+0x123", "0x20", ...]
Napi::Value ResolvePointer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return env.Null();

    uintptr_t base = 0;
    std::vector<uint64_t> offsets;

    if (!info[0].IsArray()) return env.Null();
    Napi::Array arr = info[0].As<Napi::Array>();
    uint32_t len = arr.Length();
    if (len == 0) return env.Null();

    // Parse base address
    Napi::Value v0 = arr.Get((uint32_t)0);
    if (v0.IsString()) {
        std::string baseStr = v0.As<Napi::String>().Utf8Value();
        size_t plusPos = baseStr.find('+');
        if (plusPos != std::string::npos) {
            // Format: "module.exe+offset"
            std::string modName = baseStr.substr(0, plusPos);
            std::string offsetStr = baseStr.substr(plusPos + 1);
            std::wstring wmod = Utf8ToWstring(modName);
            uintptr_t modBase = imem.GetModuleBaseAddress(wmod);
            if (modBase == 0) return env.Null(); // Module not found

            uint64_t off = 0;
            try {
                if (offsetStr.find("0x") == 0 || offsetStr.find("0X") == 0) {
                    off = std::stoull(offsetStr, nullptr, 16);
                } else {
                    off = std::stoull(offsetStr, nullptr, 10);
                }
            } catch (...) {
                return env.Null(); // Invalid offset format
            }
            base = modBase + off;
        } else {
            // Only module name
            std::wstring wmod = Utf8ToWstring(baseStr);
            base = imem.GetModuleBaseAddress(wmod);
            if (base == 0) return env.Null(); // Module not found
        }
    } else if (!JsValueToAddress(v0, base)) {
        return env.Null();
    }

    // Parse offsets
    for (uint32_t i = 1; i < len; ++i) {
        Napi::Value v = arr.Get(i);
        if (v.IsString()) {
            std::string s = v.As<Napi::String>().Utf8Value();
            uint64_t val = 0;
            try {
                if (s.find("0x") == 0 || s.find("0X") == 0) {
                    val = std::stoull(s, nullptr, 16);
                } else {
                    val = std::stoull(s, nullptr, 10);
                }
            } catch (...) {
                val = 0; // Default to 0 for invalid format
            }
            offsets.push_back(val);
        } else if (v.IsBigInt()) {
            bool lossless;
            uint64_t val = v.As<Napi::BigInt>().Uint64Value(&lossless);
            offsets.push_back(val);
        } else if (v.IsNumber()) {
            double d = v.As<Napi::Number>().DoubleValue();
            offsets.push_back(static_cast<uint64_t>(d));
        } else {
            offsets.push_back(0);
        }
    }

    uintptr_t outAddr = 0;
    bool ok = imem.ResolvePointerPath(base, offsets, outAddr);
    if (!ok) return env.Null();
    return Napi::BigInt::New(env, static_cast<uint64_t>(outAddr));
}

// read/write
Napi::Value ReadBytes(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    uintptr_t addr = 0;
    if (!JsValueToAddress(info[0], addr)) return env.Null();
    size_t size = info[1].As<Napi::Number>().Uint32Value();
    std::vector<uint8_t> buf;
    if (!imem.ReadBytes(addr, buf, size)) return env.Null();
    // return Buffer
    return Napi::Buffer<uint8_t>::Copy(env, buf.data(), buf.size());
}

Napi::Boolean WriteBytes(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    uintptr_t addr = 0;
    if (!JsValueToAddress(info[0], addr)) return Napi::Boolean::New(env, false);
    if (!info[1].IsBuffer()) return Napi::Boolean::New(env, false);
    Napi::Buffer<uint8_t> buf = info[1].As<Napi::Buffer<uint8_t>>();
    bool ok = imem.WriteBytes(addr, buf.Data(), buf.Length());
    return Napi::Boolean::New(env, ok);
}

// lock/unlock
Napi::Number LockMemory(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 3) return Napi::Number::New(env, -1);
    uintptr_t addr = 0;
    if (!JsValueToAddress(info[0], addr)) return Napi::Number::New(env, -1);
    if (!info[1].IsBuffer()) return Napi::Number::New(env, -1);
    Napi::Buffer<uint8_t> buf = info[1].As<Napi::Buffer<uint8_t>>();
    int freq = info[2].As<Napi::Number>().Int32Value();
    SIZE_T size = buf.Length();
    std::vector<uint8_t> data(buf.Data(), buf.Data() + buf.Length());
    int id = imem.LockMemory(addr, data, size, freq);
    return Napi::Number::New(env, id);
}

Napi::Boolean UnlockMemory(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return Napi::Boolean::New(env, false);
    int id = info[0].As<Napi::Number>().Int32Value();
    bool ok = imem.UnlockMemory(id);
    return Napi::Boolean::New(env, ok);
}

// shellcode injection: arg0 Buffer shellcode
Napi::Value InjectShellcode(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return env.Null();
    if (!info[0].IsBuffer()) return env.Null();
    Napi::Buffer<uint8_t> buf = info[0].As<Napi::Buffer<uint8_t>>();
    std::vector<uint8_t> sc(buf.Data(), buf.Data() + buf.Length());
    uintptr_t remote_addr = 0;
    HANDLE hThread = nullptr;
    bool ok = imem.InjectShellcode(sc, remote_addr, hThread);
    if (!ok) return env.Null();
    Napi::Object res = Napi::Object::New(env);
    res.Set("remote_addr", Napi::BigInt::New(env, static_cast<uint64_t>(remote_addr)));
    // we cannot return HANDLE cross-process safely; return thread id if needed
    DWORD tid = GetThreadId(hThread);
    res.Set("threadId", Napi::Number::New(env, (uint32_t)tid));
    return res;
}

// check if process is running
Napi::Boolean IsProcessRunning(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2) return Napi::Boolean::New(env, false);
    
    std::string exeName = info[0].As<Napi::String>().Utf8Value();
    std::string exePath = info[1].As<Napi::String>().Utf8Value();
    
    std::wstring wExeName = Utf8ToWstring(exeName);
    std::wstring wExePath = Utf8ToWstring(exePath);
    
    bool isRunning = IsRunning(wExeName, wExePath);
    return Napi::Boolean::New(env, isRunning);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("isRunning", Napi::Function::New(env, IsProcessRunning));
    exports.Set("openByPid", Napi::Function::New(env, OpenByPid));
    exports.Set("openByName", Napi::Function::New(env, OpenByName));
    exports.Set("close", Napi::Function::New(env, CloseProc));
    exports.Set("getModuleBase", Napi::Function::New(env, GetModuleBase));
    exports.Set("resolvePointer", Napi::Function::New(env, ResolvePointer));
    exports.Set("readBytes", Napi::Function::New(env, ReadBytes));
    exports.Set("writeBytes", Napi::Function::New(env, WriteBytes));
    exports.Set("lockMemory", Napi::Function::New(env, LockMemory));
    exports.Set("unlockMemory", Napi::Function::New(env, UnlockMemory));
    exports.Set("injectShellcode", Napi::Function::New(env, InjectShellcode));
    return exports;
}

NODE_API_MODULE(gamemod, Init)
