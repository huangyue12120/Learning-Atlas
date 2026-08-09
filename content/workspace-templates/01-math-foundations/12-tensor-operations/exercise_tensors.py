"""本课练习：shape、广播和注意力形状。"""


def broadcast_shape(shape_a, shape_b):
    raise NotImplementedError("实现右对齐广播 shape")


def attention_shapes(batch, sequence, embed, heads):
    raise NotImplementedError("返回注意力各步骤的 shape")


def reshape_size(shape):
    raise NotImplementedError("返回 shape 的元素总数")
