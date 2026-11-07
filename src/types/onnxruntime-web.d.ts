// 1.21.0's subpath exports omit a `types` condition. Use the runtime's
// upstream common declarations rather than maintaining a parallel API shape.
declare module 'onnxruntime-web/wasm' {
  export * from 'onnxruntime-common';
}
