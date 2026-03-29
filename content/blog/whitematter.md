---
title: Whitematter
excerpt: Neural Networks from Scratch
date: 03/14/2026
---


I wanted to know what happens between `loss.backward()` and the weights changing. Not conceptually - I mean the actual bytes. Which multiply goes where. How a convolution gradient turns into a transposed convolution. What the chain rule looks like when it's not a diagram in a textbook but 83,000 lines of C++.

So I built a deep learning framework from scratch: tensors, autograd, layers, optimizers, SIMD kernels, GPU shaders, the whole stack. Then wrapped it in a web platform where you can train models from a browser.


---

## The Numbers

| | |
|--------|-------|
| Tensor operations | **100+** |
| Layer types | **20+** (Conv2d, LSTM, MultiHeadAttention, ...) |
| C++ source | **~90,000 lines** |
| GPU backends | **Metal** (macOS) + **CUDA** (NVIDIA) |
| MNIST convergence | **99%+ accuracy, 3 epochs** |

---

## How the System Fits Together

Three layers. The browser talks to a Python API. The API generates C++ code, compiles it, and runs it. Training metrics stream back in real-time.

```mermaid
graph LR
    subgraph Browser
        A["React / Next.js<br/>Architecture builder<br/>Training dashboard"]
    end

    subgraph API ["FastAPI Backend"]
        B["Claude API"] --> C["Code Generator"]
        C --> D["CMake Compiler"]
        D --> E["Worker Process"]
    end

    subgraph Engine ["libwhitematter (C++)"]
        F["Tensor + Autograd"]
        G["Layers"]
        H["SIMD / BLAS / GPU"]
    end

    A -- "REST + SSE" --> B
    E -- "compile & exec" --> F
    F --> G
    F --> H

    style A fill:#1a1a1a,stroke:#555,color:#c0c0c0
    style F fill:#1a1a1a,stroke:#555,color:#c0c0c0
```

No Python in the training loop. The backend transpiles an architecture description into C++ source, links it against the static library, and runs the binary directly.

---

## Tensors and Autograd

The tensor is a contiguous float buffer with shape metadata, stride info, and a pointer to the function that created it. That pointer is the autograd system - every operation records a closure that knows how to compute its gradient.

```cpp
auto x = Tensor::randn({64, 784}, true);   // requires_grad=true
auto W = Tensor::randn({784, 128}, true);
auto h = x->matmul(W)->relu();
auto loss = h->sum();
loss->backward();
// x->grad and W->grad now hold ∂loss/∂x and ∂loss/∂W
```

`backward()` walks the graph in reverse topological order. Each node calls its stored closure, computes the local gradient, passes it upstream. Matmul backward for `A @ B` produces `grad @ B^T` for A and `A^T @ grad` for B. ReLU masks where input was negative. Convolution backward is a transposed convolution.

Every backward function is written by hand. That's the point.

```mermaid
flowchart TD
    X["x"] --> MM["matmul"]
    W["W"] --> MM
    MM --> R["relu"]
    R --> S["sum"]
    S --> L["loss"]

    L -. "1" .-> S
    S -. "ones" .-> R
    R -. "mask" .-> MM
    MM -. "grad @ Wᵀ" .-> X
    MM -. "xᵀ @ grad" .-> W

    style L fill:#1a1a1a,stroke:#555,color:#c0c0c0
```

Broadcasting follows NumPy rules - shapes are right-aligned, dimensions of size 1 expand. Bias addition, attention masking, and batch-wise scaling all rely on it.

---

## Layers

20+ layer types, each implementing `forward()` and `parameters()`:

```
 CONVOLUTION      RECURRENT      ATTENTION       NORMALIZATION
 ───────────      ─────────      ─────────       ─────────────
 Conv2d           LSTM           MultiHead       BatchNorm2d
 Conv1d           GRU            Grouped Query   LayerNorm
 ConvTranspose2d                 KV Cache        GroupNorm
 Grouped Conv                    RoPE            RMSNorm
 Dilated Conv                    Sinusoidal PE

 ACTIVATION       POOLING        UTILITY
 ──────────       ───────        ───────
 ReLU             MaxPool2d      Dropout
 GELU             AvgPool2d      Flatten
 SiLU             Adaptive       Sequential
 Mish             AvgPool2d      Embedding
 Tanh                            Upsample
```

ResNet-18 on CIFAR-10 looks like:

```cpp
Sequential model({
    new Conv2d(3, 64, 3, 1, 1),
    new BatchNorm2d(64),
    new ReLU(),
    // ... residual blocks with skip connections
    new AdaptiveAvgPool2d(1),
    new Flatten(),
    new Linear(512, 10)
});
```

Every layer handles its own weight initialization, tracks running stats where needed (BatchNorm), and computes gradients through its backward pass.

---

## Making It Fast

Naive matrix multiplication in C++ is slow. Cache misses kill you. Whitematter stacks three levels of optimization:

**SIMD** - Element-wise ops use vector instructions: AVX2 on Intel (8 floats/instruction), NEON on Apple Silicon (4 floats/instruction). Detected at compile time.

**BLAS** - Matmul dispatches to system BLAS (Apple Accelerate, OpenBLAS). Hand-tuned GEMM routines that exploit cache hierarchy. Roughly 10x over a naive triple loop. Convolutions use **im2col** - unfold receptive fields into columns, multiply by flattened kernels.

**GPU** - Metal compute shaders on macOS, CUDA kernels for NVIDIA. A unified `Device` abstraction: `tensor->to(Device::Metal)` is all it takes.

```mermaid
flowchart LR
    OP["Operation"] --> D{"Device?"}
    D -- "CPU" --> S["SIMD<br/>AVX2 / NEON"]
    D -- "Metal" --> M["Metal Shaders"]
    D -- "CUDA" --> C["CUDA Kernels"]
    S --> B["BLAS<br/>for GEMM"]

    style OP fill:#1a1a1a,stroke:#555,color:#c0c0c0
    style D fill:#1a1a1a,stroke:#555,color:#c0c0c0
```

Compiled with `-O3 -ffast-math -funroll-loops`. Memory allocation uses an object pool to recycle tensor buffers during training.

---

## The Training Pipeline

You describe a model in plain English. Claude suggests an architecture. You refine it in a visual node graph. Hit train.

```mermaid
flowchart TD
    A["'ResNet for CIFAR-10<br/>with dropout 0.3'"] --> B["Claude generates<br/>architecture JSON"]
    B --> C["Python transpiler<br/>emits C++ source"]
    C --> D["CMake compiles<br/>links libwhitematter.a"]
    D --> E["Binary executes<br/>stdout: epoch=1 loss=2.31 acc=0.22"]
    E --> F["Worker parses metrics<br/>pushes via SSE"]
    F --> G["Browser renders<br/>live loss curves"]

    style A fill:#1a1a1a,stroke:#555,color:#c0c0c0
```

The code generator maps architecture JSON to a complete C++ training script - includes, model definition, data loading, optimizer setup, training loop, metric printing. Writes to a temp directory, invokes CMake, worker supervises execution. Loss, accuracy, and learning rate stream to the browser via SSE. You can cancel mid-training.

**Bundled training utilities:**
- Optimizers: SGD, Adam, AdamW, RMSprop
- Schedulers: step, exponential, cosine annealing, warmup + cosine, plateau-adaptive
- Mixed precision (fp16 with loss scaling)
- Gradient accumulation and clipping
- Early stopping, checkpointing
- ONNX export

One-click deploy to AWS EC2 - provisions an instance, uploads the binary, exposes a REST inference endpoint.

---

## Reference Models

The model zoo ships with full implementations: **ResNet-18** (residual blocks, BatchNorm, adaptive pooling), **MobileNetV2** (inverted residuals, depthwise separable convolutions), and a **GPT** decoder (causal multi-head attention, positional encoding, autoregressive generation - trained on Shakespeare as proof-of-concept).

All three use only Whitematter's layer primitives. Reading the source is how you learn what these architectures actually are - not abstractions over abstractions, but the literal matrix operations.

---

## Why C++

Because I wanted to understand it.

PyTorch is great. If you're training for production, use PyTorch. But PyTorch is a building - you walk in, press buttons, things happen. I wanted to build the building. Writing matmul backward by hand teaches you it's just two transposed multiplications. Implementing BatchNorm teaches you why training and eval modes exist. Writing convolution as im2col teaches you that convolutions are matrix multiplies in disguise.

The web platform exists so the framework doesn't require a C++ toolchain to use. But the framework exists because the learning is in the implementation.

---

