分布式服务框架
==============

基于Redis来传递消息，无管理主机，由节点自主维护。

目前没有做任何性能测试。

可以随意启动多个节点进程，相同的服务也可以派发到多个不同节点来处理。


## 快速入门

```javascript

    // 初始化
    var clouds = require('clouds');

    // 连接配置
    clouds.connect({
      redis: {
        host:   '127.0.0.1',    // redis服务器地址，可选
        port:   6379,           // redis服务器端口，可选
        db:     4,              // redis数据库号，可选
        prefix: 'TEST:'         // redis键前缀，可选
      },
      service: {
        callbackTimeout:  60000 // 调用超时（毫秒），默认为60000
      }
    });


    // 注册服务，多个进程可以注册相同的服务，调用程序会自动找到最佳的进程
    clouds.register('服务名', function (err, service) {
      if (err) {
        // 注册服务时出错了
        throw err;
      }

      // 若没有出错，则service为该服务实例
      // 注册事件处理函数
      service.on('事件名', function (参数, callback) {
        // 最后一个参数是回调函数，当该事件需要传送消息给调用者时，
        // 可以通过该回调函数来传送，格式为： callback(err, 参数);
      });
    });


    // 引用服务
    var test = clouds.require('服务名');
    
    // 触发相应的事件
    test.emit('事件名', 参数);

    // 如果需要接收回调：
    test.emit('事件名', 参数, function (err, 参数) {
      if (err) {
        // 触发事件时出错了
        throw err;
      }
    });

    // 远程进程可能由于断线了，或这其他原因，超过了最大的等待时间（超时），会导致超时
    // 可用通过 pemit() 来触发事件，若失败会尝试换另一个节点进程来完成
    test.pemit(最大尝试次数, '事件名', 参数, function (err, 参数) {
      if (err) {
        // 出错
        throw err;
      }
    });
```


## 原理

1. `clouds.connect()`连接时，会为当前进程分配一个唯一的PID，并监听特定的频道，与通过该频道来接收其他进程发来的消息；

2. `clouds.register()`注册服务时，会在该服务列表中添加该进程PID，并有一个初始分数，当使用`service.emit()`来触发一个事件时，会减1分，待执行回调时，会加1分，这样可以对进程进行排序：
  + `service.emit()`会找一个分数最高的进程来发送触发事件的消息；
  + 如果一个进程接收了很多触发消息，但是没有回调，其分数就会减少，优先级也会降低；
  + `service.emit()`触发事件时，若返回`timeout`错误，则会自动执行`clouds.clean()`来清理不在线的进程；



授权
===========

基于MIT协议发布：

    Copyright (c) 2012 Lei Zongmin(雷宗民) <leizongmin@gmail.com>
    http://ucdok.com

    The MIT License

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
