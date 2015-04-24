## 自定义

### Client

Client对象提供了一些可自定义处理方法的接口，可以自定义查找可用服务器ID的策略：

```javascript
// 清理本地的服务器列表
client._setHandler('clear_server_list', function () {
  // ...
});

// 删除本地服务器缓存
client._setHandler('remove_server', function (serverId, method) {
  // serverId为服务器的ID
  // method为服务名
});

// 保存服务器列表到缓存
client._setHandler('save_server_list', function (method, list) {
  // method为服务名
  // list为可用的服务器ID列表
});

// 查找一个可用的服务器
client._setHandler('find_one_server', function (method, callback) {
  // method为服务名
  // callback为回调函数，格式：callback(err, serverId);
});
```
