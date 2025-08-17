import path from "node:path";
import { ipcMain } from "electron";

import trainer from "../native/build/Release/trainer.node";
import { bufferToNumber, IDataType, IDataTypeSize, numberToBuffer } from "./utils";

export function bindIpcEvents(): void {
  // IPC test
  ipcMain.on("ping", () => {
    console.log("pong");
  });

  ipcMain.handle("is-process-running", (_event, exePath) => {
    const exeName = path.basename(exePath);
    return trainer.isRunning(exeName, exePath);
  });

  ipcMain.handle("open-process", (_event, processName) => {
    return trainer.openByName(processName);
  });

  ipcMain.handle("read-memory", (_event, pointer, type: IDataType) => {
    const addr = trainer.resolvePointer(pointer);
    const buff = trainer.readBytes(addr, IDataTypeSize[type.toUpperCase()]);
    return buff ? bufferToNumber(buff, type) : null;
  });

  ipcMain.handle("write-memory", (_event, pointer, type: IDataType, value) => {
    const addr = trainer.resolvePointer(pointer);
    const buff = numberToBuffer(value, type);
    return trainer.writeBytes(addr, buff);
  });

  ipcMain.handle("lock-memory", (_event, pointer, type: IDataType, value) => {
    const addr = trainer.resolvePointer(pointer);
    const buff = numberToBuffer(value, type);
    return trainer.lockMemory(addr, buff, 200);
  });

  ipcMain.handle("unlock-memory", (_event, id) => {
    return trainer.unlockMemory(id);
  });
}
