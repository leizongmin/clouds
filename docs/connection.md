## 数据传输接口

数据传输接口提供以下方法：

```javascript
// 注册一个key
connection.registerKey = function (key, ttl, callback) {
  // key: 要注册的key
  // ttl: 存活时间，秒
  callback(err, key);
};

// 删除一个key
connection.deleteKey = function (key, callback) {
  // key: 要删除的key数组
  callback(err, key);
};

// 删除一组key
connection.deleteKeys = function (keys, callback) {
  // keys: 要删除的key数组
  callback(err, keys);
};

// 列出符合要求的key
connection.keys = function (pattern, callback) {
  // pattern: key规则，可使用通配符*，比如: a:*
  callback(err, keys);
};

// 发送消息
connection.send = function (receiver, data, callback) {
  // receiver: 接收者的ID
  // data: 要发送的数据，字符串
  callback(err);
};

// 接收数据
connection.on('message', function (data) {
  // data: 接收到的数据，字符串
});

// 断开连接
connection.exit = function (callback) {
  callback(err);
};
```
