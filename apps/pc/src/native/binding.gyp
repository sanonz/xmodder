{
  "targets": [
    {
      "target_name": "trainer",
      "sources": [
        "trainer.cpp",
        "memory.cpp",
        "process.cpp",
        "helper.cpp"
      ],
      "include_dirs": [
         "../../node_modules/node-addon-api"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "cflags_cc": ["-fexceptions"], 
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      }
    }
  ]
}
