export enum IDataType {
  INT8 = 'int8',
  INT16 = 'int16',
  INT32 = 'int32',
  INT64 = 'int64',

  UINT8 = 'uint8',
  UINT16 = 'uint16',
  UINT32 = 'uint32',
  UINT64 = 'uint64',

  FLOAT = 'float',
  DOUBLE = 'double'
}

export enum IDataTypeSize {
  INT8 = 1,
  INT16 = 2,
  INT32 = 4,
  INT64 = 8,

  UINT8 = 1,
  UINT16 = 2,
  UINT32 = 4,
  UINT64 = 8,

  FLOAT = 4,
  DOUBLE = 8
}

export function numberToBuffer(value: number, type: IDataType): Buffer {
  switch (type) {
    case IDataType.INT8:
      const bufInt8 = Buffer.allocUnsafe(IDataTypeSize.INT8);
      bufInt8.writeInt8(value, 0);
      return bufInt8;
    case IDataType.INT16:
      const bufInt16 = Buffer.allocUnsafe(IDataTypeSize.INT16);
      bufInt16.writeInt16LE(value, 0);
      return bufInt16;
    case IDataType.INT32:
      const bufInt32 = Buffer.allocUnsafe(IDataTypeSize.INT32);
      bufInt32.writeInt32LE(value, 0);
      return bufInt32;
    case IDataType.INT64:
      const bufInt64 = Buffer.allocUnsafe(IDataTypeSize.INT64);
      bufInt64.writeBigInt64LE(BigInt(value), 0);
      return bufInt64;
    case IDataType.UINT8:
      return Buffer.from([value & 0xFF]);
    case IDataType.UINT16:
      const bufUint16 = Buffer.allocUnsafe(IDataTypeSize.UINT16);
      bufUint16.writeUInt16LE(value, 0);
      return bufUint16;
    case IDataType.UINT32:
      const bufUint32 = Buffer.allocUnsafe(IDataTypeSize.UINT32);
      bufUint32.writeUInt32LE(value, 0);
      return bufUint32;
    case IDataType.UINT64:
      const bufUint64 = Buffer.allocUnsafe(8);
      bufUint64.writeBigUInt64LE(BigInt(value), 0);
      return bufUint64;
    case IDataType.FLOAT:
      const bufFloat = Buffer.allocUnsafe(IDataTypeSize.FLOAT);
      bufFloat.writeFloatLE(value, 0);
      return bufFloat;
    case IDataType.DOUBLE:
      const bufDouble = Buffer.allocUnsafe(IDataTypeSize.DOUBLE);
      bufDouble.writeDoubleLE(value, 0);
      return bufDouble;
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

export function bufferToNumber(buffer: Buffer, type: IDataType): number {
  switch (type) {
    case IDataType.INT8:
      return buffer.readInt8(0);
    case IDataType.INT16:
      return buffer.readInt16LE(0);
    case IDataType.INT32:
      return buffer.readInt32LE(0);
    case IDataType.INT64:
      return Number(buffer.readBigInt64LE(0));
    case IDataType.UINT8:
      return buffer.readUInt8(0);
    case IDataType.UINT16:
      return buffer.readUInt16LE(0);
    case IDataType.UINT32:
      return buffer.readUInt32LE(0);
    case IDataType.UINT64:
      return Number(buffer.readBigUInt64LE(0));
    case IDataType.FLOAT:
      return buffer.readFloatLE(0);
    case IDataType.DOUBLE:
      return buffer.readDoubleLE(0);
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}
