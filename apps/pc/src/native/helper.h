#pragma once
#include <napi.h>
#include <string>
#include <windows.h>

// helper to convert JS BigInt/Number -> uintptr_t
bool JsValueToAddress(const Napi::Value& v, uintptr_t &out);

// helper: JS string (utf-8) -> wstring
std::wstring Utf8ToWstring(const std::string& s);
