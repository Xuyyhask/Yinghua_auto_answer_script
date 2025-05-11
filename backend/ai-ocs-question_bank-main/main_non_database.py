import json
import re
import traceback
from flask_cors import CORS
from flask import request, jsonify, Flask
from utils.volcengine import query_large_model  # 添加导入AI模型查询函数

# 读取配置文件
with open('config.json', 'r', encoding='utf-8') as f:
    API_CONFIG = json.load(f)

def search_answer():
    title = request.args.get('title', '').strip()
    options = request.args.get('options', '')
    question_type = request.args.get('type', '')
    
    if not title:
        return jsonify({
            "success": False,
            "error": "缺少题目参数"
        }), 400
    
    try:
        # 直接使用AI获取答案
        try:
            print(f"开始调用AI模型，参数：title={title}, options={options}, question_type={question_type}")
            ai_answer = query_large_model(title, options, question_type)
            print(f"AI模型返回结果: {ai_answer}")
            
            # 处理AI返回的答案，解析JSON格式
            if ai_answer:
                try:
                    # 尝试解析JSON格式的答案
                    if "{" in ai_answer and "}" in ai_answer:
                        # 提取JSON部分 - 从第一个{到最后一个}
                        start_idx = ai_answer.find("{")
                        end_idx = ai_answer.rfind("}") + 1
                        json_str = ai_answer[start_idx:end_idx]
                        
                        # 处理可能的格式问题
                        # 1. 替换单引号为双引号
                        json_str = json_str.replace("'", '"')
                        
                        # 2. 处理没有引号的键名 {answer: -> {"answer":
                        json_str = re.sub(r'{(\s*)(\w+)(\s*):', r'{\1"\2"\3:', json_str)
                        json_str = re.sub(r',(\s*)(\w+)(\s*):', r',\1"\2"\3:', json_str)
                        
                        # 3. 移除所有换行符和多余空格，使JSON更紧凑
                        json_str = re.sub(r'\s+', ' ', json_str).strip()
                        
                        print(f"处理后的JSON字符串: {json_str}")
                        
                        # 尝试解析JSON
                        answer_dict = json.loads(json_str)
                        
                        # 提取answer字段
                        if "answer" in answer_dict:
                            ai_answer = answer_dict["answer"]
                        elif "anwser" in answer_dict:  # 处理可能的拼写错误
                            ai_answer = answer_dict["anwser"]

                except json.JSONDecodeError as e:
                    print(f"解析AI回答JSON失败: {str(e)}")
                    print(f"原始JSON字符串: {json_str if 'json_str' in locals() else '未提取'}")
                    
                    # 尝试直接提取引号中的内容作为答案
                    if '"answer"' in ai_answer or '"anwser"' in ai_answer:
                        try:
                            # 使用正则表达式提取引号中的内容
                            answer_match = re.search(r'"answer"\s*:\s*"([^"]+)"', ai_answer)
                            if answer_match:
                                ai_answer = answer_match.group(1)
                            else:
                                answer_match = re.search(r'"anwser"\s*:\s*"([^"]+)"', ai_answer)
                                if answer_match:
                                    ai_answer = answer_match.group(1)
                        except Exception as regex_error:
                            print(f"正则提取答案失败: {str(regex_error)}")
            
            # 如果AI返回了有效答案
            if ai_answer and "API调用失败" not in ai_answer and "无法从API获取答案" not in ai_answer and "API请求异常" not in ai_answer:
                return jsonify({
                    "success": True,
                    "data": {
                        "code": 1,
                        "data": ai_answer,
                        "msg": "AI回答"
                    }
                })
            else:
                print(f"AI模型未返回有效答案: {ai_answer}")
                
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"调用AI模型异常: {str(e)}")
            print(f"详细错误信息: {error_trace}")
        
        # 如果没有找到答案，返回结果
        return jsonify({
            "success": True,
            "data": {
                "code": 0,
                "data": None,
                "msg": "未找到答案"
            }
        })
            
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"查询失败: {str(e)}")
        print(f"详细错误信息: {error_trace}")
        return jsonify({
            "success": False,
            "error": f"查询失败: {str(e)}"
        }), 500

def init_routes(app):
    app.route('/api/query', methods=['GET'])(search_answer)

def print_api_config(host, port):
    """打印API配置信息"""
    # 如果host是0.0.0.0，在配置中显示为127.0.0.1
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    
    api_config = {
        "name": "自建题库",
        "homepage": "",
        "url": f"http://{display_host}:{port}/api/query",
        "method": "get",
        "type": "GM_xmlhttpRequest",
        "contentType": "json",
        "data": {
            "title": "${title}",
            "options": "${options}",
            "type": "${type}"
        },
        "handler": "return (res)=>res.code === 0 ? [undefined, undefined] : [undefined,res.data.data]"
    }
    print("\nAPI配置信息:")
    print(json.dumps(api_config, ensure_ascii=False, indent=2))

def create_app():
    app = Flask(__name__)
    
    #允许跨域请求 
    CORS(app)
    
    # 注册路由
    init_routes(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    host = API_CONFIG["host"]
    port = API_CONFIG["port"]
    # 同样在启动信息中也使用显示用的host
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    print(f"启动Flask服务器，地址: {display_host}:{port}")
    print_api_config(host, port)
    app.run(host=host, port=port, debug=True)