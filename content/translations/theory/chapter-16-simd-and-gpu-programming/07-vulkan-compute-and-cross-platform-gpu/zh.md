---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/07. vulkan compute and cross-platform GPU.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: b1be6058081d904d84d9b5653e18151ba40ca51cf76108ba44a9394eb0d850fe
status: reviewed
---
# Vulkan 计算与跨平台 GPU

*Vulkan 是覆盖多个主要 GPU 厂商与平台的低级计算 API，可用于 NVIDIA、AMD、Intel 和 Android，并可通过 MoltenVK 映射到 Apple 平台。本文介绍 Vulkan 架构与计算流水线、如何用 GLSL 编写计算着色器、GPU 计算程序的 C++ 配置、共享内存与同步、浏览器端 WebGPU，以及实际的机器学习推理示例。*

- CUDA 在 NVIDIA 硬件上占据主导地位，但并非所有部署目标都有 NVIDIA GPU。移动应用可能运行在 Qualcomm Adreno 或 ARM Mali GPU 上，Web 应用运行在浏览器中，游戏引擎则可能需要同时支持 AMD、Intel 和 NVIDIA。对于原生跨厂商 GPU 计算，**Vulkan** 是重要选择之一；浏览器场景使用后文介绍的 WebGPU。

> **编者注**：WebGPU 是独立的 Web 标准与 API，并不是浏览器中的 Vulkan。浏览器实现可在不同系统上把 WebGPU 映射到 Vulkan、Metal 或 Direct3D 12；因此原文“通过 WebGPU 在浏览器运行 Vulkan”的说法不够准确。

- Vulkan 很冗长——一个“Hello World”计算程序约有 300 行 C++。但这是**显式控制**的代价：所有 GPU 资源（内存、流水线、命令缓冲区）都由你自行管理。这样能最大化性能与可移植性，却会降低开发速度。

## Vulkan 架构概览

- Vulkan 是 Khronos Group (OpenGL 的创建者组织) 创建的低级 GPU API。与 CUDA 不同，Vulkan 要求你显式管理 GPU 资源：

    - **实例和设备**: 创建一个 Vulkan 实例、枚举可用的 GPU 并选择一个。
    - **内存**：显式分配 GPU 内存并指定内存类型（设备本地内存追求速度，主机可见内存供 CPU 访问）。
    - **缓冲区**: 创建引用已分配内存的缓冲区对象。
    - **描述符集**：把缓冲区绑定到着色器输入（类似计算着色器的函数参数）。
    - **计算流水线**: 编译着色器并创建流水线对象。
    - **命令缓冲区**：记录 GPU 命令序列（绑定流水线、绑定描述符集、分派计算）。
    - **队列提交**: 将命令缓冲区提交到 GPU 进行执行。
    - **同步**: 使用栅栏和屏障，确保正确的排序。

- 这与 CUDA 的 `cudaMalloc` + kernel launch 模型大不相同。在 CUDA 中，驱动程序处理大部分工作，而无需你显式管理。在 Vulkan 中，你需要自己完成。

### 为什么如此冗长？

- Vulkan 之所以采用显式设计，原因有二：

    1. **驱动程序简化**: OpenGL 驱动程序非常复杂（它们必须猜测应用程序的意图并进行优化）。Vulkan 将此责任移至应用程序，使驱动器更简单、更可预测且易于跨厂商正确实现。
    2. **性能**: 通过显式控制内存布局、同步和命令批处理，应用程序可以做出最佳决策。在 CUDA 中，驱动程序可能会插入不必要的同步。在 Vulkan 中，你仅当需要时才进行同步。

## GLSL 计算着色器

- **计算着色器（compute shader）**是在 GPU 上运行的程序，类似 CUDA 内核。它使用 **GLSL**（OpenGL Shading Language）编写，并编译为 **SPIR-V** 字节码（一种可移植二进制格式）。

### 向量加法

```glsl
// add.comp — compile with: glslangValidator -V add.comp -o add.spv
#version 450

// Workgroup size: 256 invocations per workgroup (= threads per block in CUDA)
layout(local_size_x = 256) in;

// Buffer bindings (like kernel arguments)
layout(set = 0, binding = 0) buffer InputA { float a[]; };
layout(set = 0, binding = 1) buffer InputB { float b[]; };
layout(set = 0, binding = 2) buffer Output { float c[]; };

// Push constant: small uniform data (like a kernel parameter)
layout(push_constant) uniform PushConstants {
    uint n;  // number of elements
};

void main() {
    uint idx = gl_GlobalInvocationID.x;  // global thread index
    if (idx < n) {
        c[idx] = a[idx] + b[idx];
    }
}
```

- **映射到 CUDA 概念**:

| Vulkan | CUDA | 含义 |
|--------|------|---------|
| Workgroup | Block | 可以共享内存的线程组 |
| Invocation | Thread | 单个执行单元 |
| `gl_GlobalInvocationID` | `blockIdx * blockDim + threadIdx` | 全局线程索引 |
| `gl_LocalInvocationID` | `threadIdx` | 工作组内的线程索引 |
| `gl_WorkGroupID` | `blockIdx` | 工作组索引 |
| `local_size_x` | `blockDim.x` | 每个工作组中的线程数 |
| Storage buffer | Global memory | GPU 显存 (读/写) |
| Shared memory (`shared`) | `__shared__` | 每工作组快速内存 |
| Push constant | Kernel argument | 少量统一数据 |

### 使用共享内存的 ReLU

```glsl
// relu_shared.comp
#version 450

layout(local_size_x = 256) in;

layout(set = 0, binding = 0) buffer Input  { float input_data[]; };
layout(set = 0, binding = 1) buffer Output { float output_data[]; };

layout(push_constant) uniform PushConstants { uint n; };

// Shared memory (equivalent to CUDA __shared__)
shared float tile[256];

void main() {
    uint gid = gl_GlobalInvocationID.x;
    uint lid = gl_LocalInvocationID.x;

    // Load into shared memory
    if (gid < n) {
        tile[lid] = input_data[gid];
    }

    // Barrier: wait for all invocations in workgroup to finish loading
    barrier();  // equivalent to CUDA __syncthreads()

    // Compute ReLU
    if (gid < n) {
        output_data[gid] = max(tile[lid], 0.0);
    }
}
```

- 对 ReLU 而言，共享内存并非必需（该运算是逐元素的），但这个示例展示了通用模式：加载到共享内存 → 屏障 → 计算 → 存储。卷积、归约和 softmax 等需要线程协作的运算通常会使用共享内存或其他子组通信机制。

### 并行归约（求和）

```glsl
// reduce_sum.comp
#version 450

layout(local_size_x = 256) in;

layout(set = 0, binding = 0) buffer Input  { float input_data[]; };
layout(set = 0, binding = 1) buffer Output { float partial_sums[]; };

layout(push_constant) uniform PushConstants { uint n; };

shared float sdata[256];

void main() {
    uint gid = gl_GlobalInvocationID.x;
    uint lid = gl_LocalInvocationID.x;
    uint wgid = gl_WorkGroupID.x;

    // Load into shared memory
    sdata[lid] = (gid < n) ? input_data[gid] : 0.0;
    barrier();

    // Tree reduction within the workgroup
    for (uint stride = 128; stride > 0; stride >>= 1) {
        if (lid < stride) {
            sdata[lid] += sdata[lid + stride];
        }
        barrier();
    }

    // Thread 0 writes the workgroup's partial sum
    if (lid == 0) {
        partial_sums[wgid] = sdata[0];
    }
}
```

- 这是经典的并行归约模式（与 CUDA 相同）。每个工作组产生一个部分和，第二次分派再把这些部分和归约为最终结果。树形归约每一步都把活跃线程数减半：256 → 128 → 64 → ... → 1。

### 分块矩阵乘法

```glsl
// matmul_tiled.comp
#version 450

#define TILE_SIZE 16

layout(local_size_x = TILE_SIZE, local_size_y = TILE_SIZE) in;

layout(set = 0, binding = 0) buffer MatA { float A[]; };
layout(set = 0, binding = 1) buffer MatB { float B[]; };
layout(set = 0, binding = 2) buffer MatC { float C[]; };

layout(push_constant) uniform PushConstants {
    uint M, N, K;
};

shared float tileA[TILE_SIZE][TILE_SIZE];
shared float tileB[TILE_SIZE][TILE_SIZE];

void main() {
    uint row = gl_GlobalInvocationID.y;
    uint col = gl_GlobalInvocationID.x;
    uint lr = gl_LocalInvocationID.y;
    uint lc = gl_LocalInvocationID.x;

    float sum = 0.0;

    for (uint t = 0; t < (K + TILE_SIZE - 1) / TILE_SIZE; t++) {
        // Load tile of A and B into shared memory
        uint aCol = t * TILE_SIZE + lc;
        uint bRow = t * TILE_SIZE + lr;

        tileA[lr][lc] = (row < M && aCol < K) ? A[row * K + aCol] : 0.0;
        tileB[lr][lc] = (bRow < K && col < N) ? B[bRow * N + col] : 0.0;

        barrier();

        // Compute partial dot product
        for (uint k = 0; k < TILE_SIZE; k++) {
            sum += tileA[lr][k] * tileB[k][lc];
        }

        barrier();
    }

    if (row < M && col < N) {
        C[row * N + col] = sum;
    }
}
```

- 这与 CUDA 版本（文件 04）采用相同的分块算法，只是改用 GLSL 语法。概念完全一致：把分块加载到共享内存，执行屏障、计算、屏障，然后重复。

## C++ Vulkan 设置

- 计算着色器是容易的部分。难点在于 C++ 的样板代码，它创建 Vulkan 实例、分配内存、绑定缓冲区并提交命令。以下是一个精简的完整流水线版本：

```cpp
// vulkan_compute.cpp — a minimal but complete Vulkan compute example
// Compile: g++ -O3 -o vulkan_compute vulkan_compute.cpp -lvulkan
// Requires: Vulkan SDK installed, add.spv compiled from add.comp

#include <vulkan/vulkan.h>
#include <iostream>
#include <vector>
#include <fstream>
#include <cassert>

// Helper: read SPIR-V file
std::vector<uint32_t> readSPIRV(const std::string& filename) {
    std::ifstream file(filename, std::ios::ate | std::ios::binary);
    size_t fileSize = file.tellg();
    std::vector<uint32_t> buffer(fileSize / sizeof(uint32_t));
    file.seekg(0);
    file.read(reinterpret_cast<char*>(buffer.data()), fileSize);
    return buffer;
}

int main() {
    const uint32_t N = 1024;
    const size_t bufferSize = N * sizeof(float);

    // ========== 1. Create Vulkan Instance ==========
    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.apiVersion = VK_API_VERSION_1_2;

    VkInstanceCreateInfo instanceInfo{};
    instanceInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    instanceInfo.pApplicationInfo = &appInfo;

    VkInstance instance;
    vkCreateInstance(&instanceInfo, nullptr, &instance);

    // ========== 2. Select Physical Device (GPU) ==========
    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);
    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());
    VkPhysicalDevice physicalDevice = devices[0];  // use first GPU

    // Print GPU name
    VkPhysicalDeviceProperties props;
    vkGetPhysicalDeviceProperties(physicalDevice, &props);
    std::cout << "Using GPU: " << props.deviceName << "\n";

    // ========== 3. Find Compute Queue Family ==========
    uint32_t queueFamilyCount = 0;
    vkGetPhysicalDeviceQueueFamilyProperties(physicalDevice, &queueFamilyCount, nullptr);
    std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
    vkGetPhysicalDeviceQueueFamilyProperties(physicalDevice, &queueFamilyCount, queueFamilies.data());

    uint32_t computeFamily = 0;
    for (uint32_t i = 0; i < queueFamilyCount; i++) {
        if (queueFamilies[i].queueFlags & VK_QUEUE_COMPUTE_BIT) {
            computeFamily = i;
            break;
        }
    }

    // ========== 4. Create Logical Device and Queue ==========
    float queuePriority = 1.0f;
    VkDeviceQueueCreateInfo queueInfo{};
    queueInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
    queueInfo.queueFamilyIndex = computeFamily;
    queueInfo.queueCount = 1;
    queueInfo.pQueuePriorities = &queuePriority;

    VkDeviceCreateInfo deviceInfo{};
    deviceInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    deviceInfo.queueCreateInfoCount = 1;
    deviceInfo.pQueueCreateInfos = &queueInfo;

    VkDevice device;
    vkCreateDevice(physicalDevice, &deviceInfo, nullptr, &device);

    VkQueue computeQueue;
    vkGetDeviceQueue(device, computeFamily, 0, &computeQueue);

    // ========== 5. Allocate Buffers (A, B, C) ==========
    // For brevity, this uses host-visible memory (slower but simpler)
    auto createBuffer = [&](VkBuffer& buffer, VkDeviceMemory& memory) {
        VkBufferCreateInfo bufInfo{};
        bufInfo.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
        bufInfo.size = bufferSize;
        bufInfo.usage = VK_BUFFER_USAGE_STORAGE_BUFFER_BIT;
        vkCreateBuffer(device, &bufInfo, nullptr, &buffer);

        VkMemoryRequirements memReqs;
        vkGetBufferMemoryRequirements(device, buffer, &memReqs);

        // Find host-visible memory type
        VkPhysicalDeviceMemoryProperties memProps;
        vkGetPhysicalDeviceMemoryProperties(physicalDevice, &memProps);
        uint32_t memType = 0;
        for (uint32_t i = 0; i < memProps.memoryTypeCount; i++) {
            if ((memReqs.memoryTypeBits & (1 << i)) &&
                (memProps.memoryTypes[i].propertyFlags &
                 (VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT))) {
                memType = i;
                break;
            }
        }

        VkMemoryAllocateInfo allocInfo{};
        allocInfo.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO;
        allocInfo.allocationSize = memReqs.size;
        allocInfo.memoryTypeIndex = memType;
        vkAllocateMemory(device, &allocInfo, nullptr, &memory);
        vkBindBufferMemory(device, buffer, memory, 0);
    };

    VkBuffer bufA, bufB, bufC;
    VkDeviceMemory memA, memB, memC;
    createBuffer(bufA, memA);
    createBuffer(bufB, memB);
    createBuffer(bufC, memC);

    // ========== 6. Fill Input Buffers ==========
    float* ptrA;
    vkMapMemory(device, memA, 0, bufferSize, 0, (void**)&ptrA);
    for (uint32_t i = 0; i < N; i++) ptrA[i] = 1.0f;
    vkUnmapMemory(device, memA);

    float* ptrB;
    vkMapMemory(device, memB, 0, bufferSize, 0, (void**)&ptrB);
    for (uint32_t i = 0; i < N; i++) ptrB[i] = 2.0f;
    vkUnmapMemory(device, memB);

    // ========== 7. Create Compute Pipeline ==========
    auto spirvCode = readSPIRV("add.spv");
    VkShaderModuleCreateInfo shaderInfo{};
    shaderInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
    shaderInfo.codeSize = spirvCode.size() * sizeof(uint32_t);
    shaderInfo.pCode = spirvCode.data();
    VkShaderModule shaderModule;
    vkCreateShaderModule(device, &shaderInfo, nullptr, &shaderModule);

    // Descriptor set layout (tells Vulkan about the buffer bindings)
    VkDescriptorSetLayoutBinding bindings[3] = {};
    for (int i = 0; i < 3; i++) {
        bindings[i].binding = i;
        bindings[i].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        bindings[i].descriptorCount = 1;
        bindings[i].stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
    }

    VkDescriptorSetLayoutCreateInfo layoutInfo{};
    layoutInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO;
    layoutInfo.bindingCount = 3;
    layoutInfo.pBindings = bindings;
    VkDescriptorSetLayout descLayout;
    vkCreateDescriptorSetLayout(device, &layoutInfo, nullptr, &descLayout);

    // Push constant range
    VkPushConstantRange pushRange{};
    pushRange.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;
    pushRange.offset = 0;
    pushRange.size = sizeof(uint32_t);

    // Pipeline layout
    VkPipelineLayoutCreateInfo pipeLayoutInfo{};
    pipeLayoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
    pipeLayoutInfo.setLayoutCount = 1;
    pipeLayoutInfo.pSetLayouts = &descLayout;
    pipeLayoutInfo.pushConstantRangeCount = 1;
    pipeLayoutInfo.pPushConstantRanges = &pushRange;
    VkPipelineLayout pipelineLayout;
    vkCreatePipelineLayout(device, &pipeLayoutInfo, nullptr, &pipelineLayout);

    // Compute pipeline
    VkComputePipelineCreateInfo pipeInfo{};
    pipeInfo.sType = VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO;
    pipeInfo.stage.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    pipeInfo.stage.stage = VK_SHADER_STAGE_COMPUTE_BIT;
    pipeInfo.stage.module = shaderModule;
    pipeInfo.stage.pName = "main";
    pipeInfo.layout = pipelineLayout;
    VkPipeline pipeline;
    vkCreateComputePipelines(device, VK_NULL_HANDLE, 1, &pipeInfo, nullptr, &pipeline);

    // ========== 8. Descriptor Set (bind buffers to shader) ==========
    VkDescriptorPoolSize poolSize{};
    poolSize.type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    poolSize.descriptorCount = 3;

    VkDescriptorPoolCreateInfo poolInfo{};
    poolInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO;
    poolInfo.maxSets = 1;
    poolInfo.poolSizeCount = 1;
    poolInfo.pPoolSizes = &poolSize;
    VkDescriptorPool descPool;
    vkCreateDescriptorPool(device, &poolInfo, nullptr, &descPool);

    VkDescriptorSetAllocateInfo descAllocInfo{};
    descAllocInfo.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO;
    descAllocInfo.descriptorPool = descPool;
    descAllocInfo.descriptorSetCount = 1;
    descAllocInfo.pSetLayouts = &descLayout;
    VkDescriptorSet descSet;
    vkAllocateDescriptorSets(device, &descAllocInfo, &descSet);

    // Write buffer references into the descriptor set
    VkDescriptorBufferInfo bufInfos[3] = {
        {bufA, 0, bufferSize}, {bufB, 0, bufferSize}, {bufC, 0, bufferSize}
    };
    VkWriteDescriptorSet writes[3] = {};
    for (int i = 0; i < 3; i++) {
        writes[i].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        writes[i].dstSet = descSet;
        writes[i].dstBinding = i;
        writes[i].descriptorCount = 1;
        writes[i].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        writes[i].pBufferInfo = &bufInfos[i];
    }
    vkUpdateDescriptorSets(device, 3, writes, 0, nullptr);

    // ========== 9. Record and Submit Command Buffer ==========
    VkCommandPoolCreateInfo cmdPoolInfo{};
    cmdPoolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
    cmdPoolInfo.queueFamilyIndex = computeFamily;
    VkCommandPool cmdPool;
    vkCreateCommandPool(device, &cmdPoolInfo, nullptr, &cmdPool);

    VkCommandBufferAllocateInfo cmdAllocInfo{};
    cmdAllocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    cmdAllocInfo.commandPool = cmdPool;
    cmdAllocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    cmdAllocInfo.commandBufferCount = 1;
    VkCommandBuffer cmdBuf;
    vkAllocateCommandBuffers(device, &cmdAllocInfo, &cmdBuf);

    VkCommandBufferBeginInfo beginInfo{};
    beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    vkBeginCommandBuffer(cmdBuf, &beginInfo);

    vkCmdBindPipeline(cmdBuf, VK_PIPELINE_BIND_POINT_COMPUTE, pipeline);
    vkCmdBindDescriptorSets(cmdBuf, VK_PIPELINE_BIND_POINT_COMPUTE,
                            pipelineLayout, 0, 1, &descSet, 0, nullptr);
    vkCmdPushConstants(cmdBuf, pipelineLayout, VK_SHADER_STAGE_COMPUTE_BIT,
                       0, sizeof(uint32_t), &N);
    vkCmdDispatch(cmdBuf, (N + 255) / 256, 1, 1);  // launch workgroups

    vkEndCommandBuffer(cmdBuf);

    // Submit
    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    VkFence fence;
    vkCreateFence(device, &fenceInfo, nullptr, &fence);

    VkSubmitInfo submitInfo{};
    submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = &cmdBuf;
    vkQueueSubmit(computeQueue, 1, &submitInfo, fence);
    vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);

    // ========== 10. Read Results ==========
    float* ptrC;
    vkMapMemory(device, memC, 0, bufferSize, 0, (void**)&ptrC);
    std::cout << "Results: c[0]=" << ptrC[0] << " c[1]=" << ptrC[1]
              << " (expected 3.0)\n";
    bool correct = true;
    for (uint32_t i = 0; i < N; i++) {
        if (ptrC[i] != 3.0f) { correct = false; break; }
    }
    std::cout << (correct ? "ALL CORRECT" : "ERRORS FOUND") << "\n";
    vkUnmapMemory(device, memC);

    // ========== Cleanup (abbreviated) ==========
    vkDestroyFence(device, fence, nullptr);
    vkDestroyCommandPool(device, cmdPool, nullptr);
    vkDestroyPipeline(device, pipeline, nullptr);
    vkDestroyPipelineLayout(device, pipelineLayout, nullptr);
    vkDestroyDescriptorPool(device, descPool, nullptr);
    vkDestroyDescriptorSetLayout(device, descLayout, nullptr);
    vkDestroyShaderModule(device, shaderModule, nullptr);
    vkDestroyBuffer(device, bufA, nullptr); vkFreeMemory(device, memA, nullptr);
    vkDestroyBuffer(device, bufB, nullptr); vkFreeMemory(device, memB, nullptr);
    vkDestroyBuffer(device, bufC, nullptr); vkFreeMemory(device, memC, nullptr);
    vkDestroyDevice(device, nullptr);
    vkDestroyInstance(instance, nullptr);

    return 0;
}
```

- **没错，仅向量加法就约有 200 行。** CUDA 版本约 30 行，这正是显式控制的代价。不过每一行都有明确用途：没有隐藏的驱动决策、隐式同步或意外分配，一切都由你控制。

> **编者注**：上面的程序用于展示 Vulkan 对象与调用顺序，不应直接当作生产级“完整”模板。它省略了几乎所有返回值、空设备和资源创建失败检查；内存类型条件也只验证了 `HOST_VISIBLE` 与 `HOST_COHERENT` 中至少一位，而非两位都具备。实际项目应检查两个属性是否同时满足，并处理非一致性内存的刷新与失效。

- 在实践中，你会用一个辅助库（或者使用现有的库，例如 **vk-bootstrap**、**VMA** 用于内存分配或 **kompute** 用于机器学习相关的 Vulkan 计算）将此样板代码包裹起来。

## Kompute：简化 Vulkan 的 ML 应用

- **Kompute** 是一个开源 C++ 库，用于封装 Vulkan GPU 计算的样板代码。同样的向量加法可以写成：

```cpp
#include <kompute/Kompute.hpp>

int main() {
    kp::Manager mgr;

    auto tensorA = mgr.tensor({1, 1, 1, 1, 1});
    auto tensorB = mgr.tensor({2, 2, 2, 2, 2});
    auto tensorC = mgr.tensor({0, 0, 0, 0, 0});

    std::string shader = R"(
        #version 450
        layout(local_size_x = 1) in;
        layout(set=0, binding=0) buffer A { float a[]; };
        layout(set=0, binding=1) buffer B { float b[]; };
        layout(set=0, binding=2) buffer C { float c[]; };
        void main() {
            uint i = gl_GlobalInvocationID.x;
            c[i] = a[i] + b[i];
        }
    )";

    auto algorithm = mgr.algorithm({tensorA, tensorB, tensorC},
                                     kompute::Shader::compile_source(shader));

    mgr.sequence()
        ->record<kp::OpTensorSyncDevice>({tensorA, tensorB, tensorC})
        ->record<kp::OpAlgoDispatch>(algorithm)
        ->record<kp::OpTensorSyncLocal>({tensorC})
        ->eval();

    // tensorC now contains [3, 3, 3, 3, 3]
}
```

- 这样可读性高得多。Kompute 负责实例创建、设备选择、内存分配、描述符集和命令缓冲区管理，你只需关注着色器与数据。

## WebGPU: 浏览器中的 GPU 计算

- **WebGPU** 是 WebGL 的后继者，为 JavaScript 提供现代 GPU 访问能力。它构建在 Vulkan（Linux/Android）、Metal（macOS/iOS）和 DirectX 12（Windows）之上，并抽象掉平台差异。

- WebGPU 使用 **WGSL** (WebGPU 着色语言) 代替 GLSL:

```wgsl
// add.wgsl — WebGPU compute shader
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> c: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    c[i] = a[i] + b[i];
}
```

- **JavaScript 设置** (浓缩):

```javascript
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

// Create buffers
const bufferA = device.createBuffer({ size: N * 4, usage: GPUBufferUsage.STORAGE, mappedAtCreation: true });
new Float32Array(bufferA.getMappedRange()).fill(1.0);
bufferA.unmap();

// ... (similar for B and C)

// Create pipeline from WGSL shader
const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: device.createShaderModule({ code: wgslSource }), entryPoint: 'main' }
});

// Dispatch
const encoder = device.createCommandEncoder();
const pass = encoder.beginComputePass();
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(Math.ceil(N / 256));
pass.end();
device.queue.submit([encoder.finish()]);
```

- **WebGPU 为什么对机器学习重要**：在浏览器内运行推理意味着没有服务器成本和网络延迟，而且用户数据不会离开设备。**ONNX Runtime Web**、**Transformers.js** 等库使用 WebGPU 在客户端完整运行模型，包括小型大语言模型。

## 使用 Vulkan 的时机

| 场景 | 使用 Vulkan? | 原因 / 替代方案 |
|---|---|---|
| ML 训练 | 否 | CUDA/Triton 在 NVIDIA GPU 上更简单、更快 |
| NVIDIA GPU 上推理 | 否 | TensorRT 或 CUDA 更佳 |
| AMD/Intel GPU 上推理 | **是** | 可作为跨厂商 GPU 计算选项；也需结合平台评估其他运行时 |
| Android 移动推理 | **是** | Vulkan 是 Android 的标准 GPU API |
| iOS 移动推理 | 否 | 直接使用 Metal（MoltenVK 会增加开销） |
| Web 推理 | **WebGPU** | 基于 Vulkan/Metal/DX12 |
| 游戏引擎 + ML | **是** | 引擎已经使用 Vulkan 进行渲染 |
| 通用跨平台库 | **是** | 一套 Vulkan 路径可覆盖多个 GPU 厂商 |
| 学习 GPU 编程 | 视情况而定 | CUDA 更易上手；Vulkan 能揭示更多底层细节 |

## 编码任务（使用 g++ -lvulkan 进行编译，需要 Vulkan SDK）

1. 编译并运行上面的向量加法示例。修改着色器程序，使其计算 `c[i] = a[i] * b[i] + a[i]`（融合乘加），并验证结果。

2. 编写计算着色器，使用共享内存对一行数据应用 softmax（包括求最大值和求和的归约步骤），并用已知值测试。

```glsl
// softmax.comp — compile with: glslangValidator -V softmax.comp -o softmax.spv
#version 450

#define WG_SIZE 256

layout(local_size_x = WG_SIZE) in;

layout(set = 0, binding = 0) buffer Input  { float input_data[]; };
layout(set = 0, binding = 1) buffer Output { float output_data[]; };

layout(push_constant) uniform PC { uint n; };

shared float sdata[WG_SIZE];

void main() {
    uint gid = gl_GlobalInvocationID.x;
    uint lid = gl_LocalInvocationID.x;

    // Step 1: find max (for numerical stability)
    sdata[lid] = (gid < n) ? input_data[gid] : -1e30;
    barrier();
    for (uint s = WG_SIZE / 2; s > 0; s >>= 1) {
        if (lid < s) sdata[lid] = max(sdata[lid], sdata[lid + s]);
        barrier();
    }
    float maxVal = sdata[0];
    barrier();

    // Step 2: compute exp(x - max)
    float expVal = (gid < n) ? exp(input_data[gid] - maxVal) : 0.0;
    sdata[lid] = expVal;
    barrier();

    // Step 3: sum of exp values
    for (uint s = WG_SIZE / 2; s > 0; s >>= 1) {
        if (lid < s) sdata[lid] += sdata[lid + s];
        barrier();
    }
    float sumExp = sdata[0];

    // Step 4: normalise
    if (gid < n) {
        output_data[gid] = expVal / sumExp;
    }
}
```

> **编者注**：这个参考着色器一次只正确处理一个工作组内、最多 `WG_SIZE`（此处为 256）个元素。应以单工作组分派，并保证 `n <= WG_SIZE`；若一行超过 256 个元素或分派多个工作组，需要增加跨工作组归约或采用分块 softmax，不能直接复用当前结果。

3. 修改 C++ 主机代码，对计算着色器做性能剖析：使用 Vulkan 时间戳查询或 CPU 端栅栏测量分派（不含设置）的耗时，并计算实际带宽（GB/s）。
