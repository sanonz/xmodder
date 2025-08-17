#include "helper.h"

// helper to convert JS BigInt/Number -> uintptr_t
bool JsValueToAddress(const Napi::Value& v, uintptr_t &out) {
    if (v.IsBigInt()) {
        bool lossless = false;
        uint64_t vv = v.As<Napi::BigInt>().Uint64Value(&lossless);
        out = static_cast<uintptr_t>(vv);
        return true;
    } else if (v.IsNumber()) {
        double d = v.As<Napi::Number>().DoubleValue();
        out = static_cast<uintptr_t>(static_cast<uint64_t>(d));
        return true;
    } else {
        return false;
    }
}

// helper: JS string (utf-8) -> wstring
std::wstring Utf8ToWstring(const std::string& s) {
    if (s.empty()) return std::wstring();
    int len = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), NULL, 0);
    std::wstring r(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), &r[0], len);
    return r;
}
