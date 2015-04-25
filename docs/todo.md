## 计划

+ 实现broker，使得可以通过broker来自定义服务器查找策略
+ 抽象redis通讯层，使得可以自定义消息传输接口
+ 夸语言支持（如Go、PHP）


### broker

+ Brocker原则上只能启动一份
+ Client每次调用服务时，需要请求Brocker返回一个可用的serverId，再向此serverId发送调用请求
+ Server每秒向Brocker发送一次心跳，Brocker优先返回最近发来心跳信号的serverId
+ Brocker提供自定义返回serverId算法的接口
+ Client定期汇报调用服务次数、重试次数、失败次数、成功次数
+ Server定期汇报服务被调用次数、失败响应次数（返回err）、成功返回次数（err=null）
+ Brocker提供查询Client和Server状态的接口
