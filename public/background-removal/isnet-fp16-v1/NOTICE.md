ISNet FP16 background removal assets

Model: IS-Net general-use, ONNX FP16 conversion distributed by IMG.LY.
IS-Net authors: Xuebin Qin, Hang Dai, Xiaobin Hu, Deng-Ping Fan, Ling Shao,
and Luc Van Gool (Highly Accurate Dichotomous Image Segmentation, ECCV 2022).

The model publisher declares the ONNX model MIT licensed:
https://huggingface.co/imgly/isnet-general-onnx
Pinned revision: 440dea96dd4a3b06bbbf5abec3e26569dd7ec49f
Artifact: onnx/model_fp16.onnx
SHA-256: 2eb4b5dda7ec41c617e59706e5aafa1f978c9a5f983d2518d9f0ae4d6eb04f20
The publisher's model card is metadata-only; it contains no separate copyright
notice. Attribution to the authors and conversion publisher is retained above.

MIT permission terms for the model:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

The original DIS research code is separately Apache-2.0 licensed; its license
is preserved in DIS-APACHE-2.0.txt. SavDown does not redistribute the DIS5K
training dataset or copy its research implementation.
https://github.com/xuebinqin/DIS

Runtime: Microsoft ONNX Runtime Web 1.21.0, MIT licensed.
Full upstream copyright and license: ONNX-RUNTIME-MIT.txt.
https://github.com/microsoft/onnxruntime/tree/v1.21.0

SavDown's image preparation, asset loader, worker integration and compositing
code are implemented independently; @imgly/background-removal code is not
included in this tool's browser bundle.
