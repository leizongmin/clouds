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


## 命名规范

### ID

每个客户端均有一个唯一的ID，格式为：`类型首字母.主机名称MD5值前8位.进程PID.当前进程计数器`

+ 类型首字母：比如`Server`为`s`，`Client`为`c`
+ 主机名称MD5值前8位：`md5(hostname).substr(0, 8)`
+ 进程PID：当前进程的PID
+ 当前进程计数器：当前进程所启动的`clouds`客户端的计数器

各个客户端之间通过其唯一ID可以直接通讯。

### 注册可用服务器列表

当服务器提供某一个服务时，需要向Redis服务器注册一个Key（指定TTL），格式为：`S:服务名:服务器ID`

#### 查找某个服务的可用服务器列表

取Key列表：`S:服务名:*`

### 订阅消息

订阅频道格式为：`L:客户端ID`



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
