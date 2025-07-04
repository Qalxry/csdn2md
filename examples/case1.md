# 文章总标题

> Shizuri Yuki 已于 2025-01-12 01:08:48 修改 阅读量99 收藏 3 点赞数 4 公开

# 一级标题

## 二级标题

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题

正文

 **正文加粗** 

 <u>正文下划线</u> 

 <u>*正文斜体*</u> 

 ~~*正文删除线*~~ 

 ~~<u>***组合下划线、斜体、删除线、加粗***</u>~~ 

 [有序列表](https://so.csdn.net/so/search?q=%E6%9C%89%E5%BA%8F%E5%88%97%E8%A1%A8&spm=1001.2101.3001.7020) 示例


1. 有序列表：表项1
2. 有序列表：表项2
3. 有序列表：表项3

 [无序列表](https://so.csdn.net/so/search?q=%E6%97%A0%E5%BA%8F%E5%88%97%E8%A1%A8&spm=1001.2101.3001.7020) 示例


- 无序列表：表项1
- 无序列表：表项2
- 无序列表：表项3

有序列表组合示例


1. 有序列表：表项1
   1. 子有序列表：表项1-1
   2. 子有序列表：表项1-2
2. 有序列表：表项2
   1. 子有序列表：表项2-1
      1. 子有序列表：表项2-1-1

无序列表组合示例


- 无序列表：表项1
  - 子无序列表：表项1-1
  - 子无序列表：表项1-2
- 无序列表：表项2
  - 子无序列表：表项2-1
    - 子无序列表：表项2-1-1

默认 [左对齐](https://so.csdn.net/so/search?q=%E5%B7%A6%E5%AF%B9%E9%BD%90&spm=1001.2101.3001.7020) 文本

默认左对齐文本

<div style="text-align:center;">居中对齐文本</div>

<div style="text-align:center;">居中对齐文本</div>

<div style="text-align:right;">右对齐文本</div>

<div style="text-align:right;">右对齐文本</div>

<div style="text-align:justify;">两端对齐文本</div>

<div style="text-align:justify;">两端对齐文本</div>

<div style="text-align:justify;"></div>

<div style="text-align:justify;">水平线示例</div>

---



块引用示例

> 引用内容
> 
> 引用内容
> 
> 引用内容



代码块示例（C++）

```cpp
#include <iostream>
#include <bitset>
 
int main() {
    int a = 15;
    int b = 7;
    int c = 3;
 
    // 复杂算术运算
    int result1 = (a + b) * c - (a / b) + (a % c);
    std::cout << "Result of (a + b) * c - (a / b) + (a % c): " << result1 << std::endl;
 
    // 位运算
    int result2 = (a & b) | (c << 2);
    std::cout << "Result of (a & b) | (c << 2): " << result2 << std::endl;
    std::cout << "Binary representation of result2: " << std::bitset<8>(result2) << std::endl;
 
    // 逻辑运算
    bool result3 = (a > b) && (b < c) || (a == 15);
    std::cout << "Result of (a > b) && (b < c) || (a == 15): " << std::boolalpha << result3 << std::endl;
 
    // 三元运算符
    int result4 = (a > b) ? (a - b) : (b - a);
    std::cout << "Result of (a > b) ? (a - b) : (b - a): " << result4 << std::endl;
 
    // 复杂表达式
    int result5 = (a ^ b) + (c * 2) - (~a);
    std::cout << "Result of (a ^ b) + (c * 2) - (~a): " << result5 << std::endl;
 
    // 特殊字符
    char specialChar = '@';
    std::cout << "Special character: " << specialChar << std::endl;
 
    // 指针和引用
    int* ptr = &a;
    int& ref = b;
    *ptr += 5;
    ref -= 3;
    std::cout << "Value of a after pointer operation: " << a << std::endl;
    std::cout << "Value of b after reference operation: " << b << std::endl;
 
    return 0;
}
```



代码块示例（Python）

```python
import torch
a = torch.tensor([1,2,3,4,5])
print(a)
```

| 表项1 | 表项2 |
|---|---|
| 表项3 | 表项4 |
| 表项5 | 表项6 |


图片链接示例

 <img src="https://i-blog.csdnimg.cn/blog_migrate/929919d44f1afa2ad98a6072e7a5301b.png" alt=""/>



BiliBili 视频链接示例

<div align="center" style="border: 3px solid gray;border-radius: 27px;overflow: hidden;"> <a class="link-info" href="https://player.bilibili.com/player.html?aid=113796869785844" rel="nofollow" title="为什么俄罗斯的二次元老婆，能把百万中国宅男迷成这样？">为什么俄罗斯的二次元老婆，能把百万中国宅男迷成这样？</a><iframe id="phtQXsQR-1736582246507" frameborder="0" src="https://player.bilibili.com/player.html?aid=113796869785844" allowfullscreen="true" data-mediaembed="bilibili" style="width: 100%; aspect-ratio: 2;"></iframe></div>

公式块示例

$$
\iiint\limits_{V} \left( \frac{\partial^2 \psi}{\partial x^2} + \frac{\partial^2 \psi}{\partial y^2} + \frac{\partial^2 \psi}{\partial z^2} \right) \, dV = \frac{1}{\sqrt{2\pi\sigma^2}} \int_{-\infty}^{\infty} e^{-\frac{(x-\mu)^2}{2\sigma^2}} \, dx \cdot \sum_{n=0}^{\infty} \frac{(-1)^n \alpha^n}{n!} \sqrt{\frac{\Gamma(n+\frac{1}{2})}{\beta^{2n+1}}}
$$

链接示例

 [链接替换文本](http://xn--url-y46f519s) 

**目录**

[TOC]

带颜色文本示例：

<span style="background-color:#fe2c24;">红色背景</span>

<span style="background-color:#ffd900;">黄色背景</span>

<span style="background-color:#4da8ee;">蓝色背景</span>

<span style="color:#fe2c24;">红色前景</span>

<span style="color:#ffd900;">黄色前景</span>

<span style="color:#4da8ee;">蓝色前景</span>

<span style="color:#ffd900;"><span style="background-color:#fe2c24;">红色背景+黄色前景</span></span>



**目录**

[TOC]

---