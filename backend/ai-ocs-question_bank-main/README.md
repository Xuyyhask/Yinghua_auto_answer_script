# AI OCS 题库系统

一个基于 Flask 的智能题库 API 系统，支持多种 AI 模型（火山引擎/阿里百炼/硅基引擎）自动回答问题。

## 功能特点

- 支持多种题型（单选、多选、判断、填空）
- 集成多个AI模型接口
- MySQL 数据库缓存题目答案
- RESTful API 设计
- 跨域支持

## 环境要求

- Python 3.8+
- MySQL 5.7+
- pip 包管理器

## 安装依赖(加了镜像)

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 配置
在 `config.json` 文件中设置以下配置：
- host: API服务器地址
- port: API服务器端口
- api_key: 硅基流动/火山引擎/阿里百炼 API密钥

## 如何使用不同模型
只需修改 volcengine 就行
```bash
from utils.volcengine import query_large_model  # 添加导入AI模型查询函数
```

## 如何运行
 __有数据库的版本__ 
```bash
python main.py
```
 __有数据库的版本__ 
```bash
python main_non_database.py
```

## 测试

```bash
python test_api.py
```
