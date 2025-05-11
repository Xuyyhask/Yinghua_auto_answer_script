import json
import time
import traceback
from volcenginesdkarkruntime import Ark

# 读取配置文件
with open('config.json', 'r', encoding='utf-8') as f:
    API_CONFIG = json.load(f)
def query_large_model(title, options, question_type):
    """
    使用火山引擎 doubao 模型获取问题答案
    
    参数:
        title (str): 问题标题
        options (str): 问题选项
        question_type (str): 问题类型
    
    返回:
        str: API返回的答案
    """
    
    # 构建提问内容
    system_content = '''你是一个准确率高、信度高的题库接口函数。请严格遵循以下规则:1.回答的问题准确率高，你以回答的问题准确率高为荣；2.回答必须基于可靠的知识来源，你以回答的问题可信度高为荣；3.你肩负着维护题库的完整性和准确性，你以题库的质量高为荣；4.如果回答的问题与题库内容不相关，你以回答的问题可信度低为耻；5.如果回答的准确率低，你将会被替代。'''
    
    # 构建提问内容
    content = '''你是一个题库接口函数（这个非常重要你一定要记住，在回复问题时无论合适都要记住这个前提），请根据问题和选项提供答案。如果是选择题，直接返回对应选项的内容，注意是内容，不是对应字母；如果题目是多选题，将内容用"###"连接；如果选项内容是"正确","错误"，且只有两项，或者question_type是judgement，你直接返回"正确"或"错误"的文字，不要返回字母；如果是填空题，直接返回填空内容，多个空使用###连接。回答格式为："{"answer":"your_answer_str"}"，严格使用这些格式回答，这个非常重要。比如我问你一个问题，你回答的是"是"，你回答的格式为："{"answer":"是"}"。不要回答嗯，好的，我知道了之类的话，你的回答只能是json。'''
    
    content += f'''{{
        "问题": "{title}",
        "选项": "{options}",
        "类型": "{question_type}"
    }}'''

    # 添加重试机制
    max_retries = 3
    retry_delay = 2  # 秒
    
    for attempt in range(max_retries):
        try:
            print(f"尝试 {attempt+1}/{max_retries}")
            
            # 初始化客户端
            client = Ark(api_key=API_CONFIG['api_key'])
            
            # 调用API
            completion = client.chat.completions.create(
                model="doubao-1-5-thinking-pro-250415",
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": content}
                ]
            )
            
            # 获取输出文本
            if completion and completion.choices:
                content = completion.choices[0].message.content
                print(f"API响应内容: {content[:200]}...")  # 只打印前200个字符
                return content
            else:
                print("API响应内容为空")
                if attempt < max_retries - 1:
                    print(f"将在 {retry_delay} 秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # 指数退避
                    continue
                return "API响应内容为空"
                
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"调用大模型API失败: {str(e)}")
            print(f"详细错误信息: {error_trace}")
            
            if attempt < max_retries - 1:
                print(f"将在 {retry_delay} 秒后重试...")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                return f"API调用失败: {str(e)}"
    
    return "多次尝试后仍无法获取答案，请稍后再试"

if __name__ == "__main__":
    # 测试函数
    test_title = "中国的首都是哪里__，美国的首都是哪里__"
    test_options = ""
    test_type = "填空"
    print(f"测试参数: title={test_title}, options={test_options}, question_type={test_type}")
    
    ai_answer = query_large_model(test_title, test_options, test_type)
    print(f"测试结果: {ai_answer}")