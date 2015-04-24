## 通信协议

使用JSON结构：`{"t": "命令类型", s: "发送者", d: {参数}}`

#### 客户端之间发送消息

```json
{
  "t": "m",
  "s": "发送者",
  "d": "任意可转换为JSON字符串的消息内容"
}
```

#### 调用服务

```json
{
	"t": "c",
	"s": "发送者",
	"d": {
	  "i": "消息ID",
	  "m": "要调用的服务名称",
	  "a": ["参数数组"]
	}
}
```

#### 调用服务执行结果

```json
{
  "t": "r",
  "s": "发送者",
  "d": {
    "i": "消息ID",
    "e": "是否出错，未出错为null",
    "r": "执行结果"
  }
}
```


## 函数

### 封装数据包

#### 创建协议封装器

```JavaScript
var protocol = new Protocol(sender);
```

+ __sender__ 发送者ID

#### 封装客户端消息

```JavaScript
protocol.packMessage(receiver, content);
```

+ __receiver__ 接收者ID
+ __content__ 消息内容

#### 封装服务调用

```JavaScript
protocol.packCall(method, args);
```

+ __method__ 要调用的服务名称
+ __args__ 调用参数数组

#### 封装调用结果

```JavaScript
protocol.packResult(messageId, err, result);
```

+ __messageId__ 消息ID
+ __err__ 是否出错，null表示没出错
+ __result__ 执行结果

### 注册自定义消息

```JavaScript
this.setMessageHandler('消息类型', function (msg) {
  // 消息内容，如 {"t": "命令类型", s: "发送者", d: {参数}}
});
```
