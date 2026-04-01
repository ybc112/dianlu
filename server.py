#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
逻辑门闯关：电路解谜实验室
Python后端服务器
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from pathlib import Path

class GameHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def do_GET(self):
        """处理GET请求"""
        parsed_path = urllib.parse.urlparse(self.path)
        
        # API路由
        if parsed_path.path.startswith('/api/'):
            self.handle_api_request(parsed_path)
        else:
            # 静态文件服务
            super().do_GET()
    
    def do_POST(self):
        """处理POST请求"""
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path.startswith('/api/'):
            self.handle_api_request(parsed_path)
        else:
            self.send_error(404, "Not Found")
    
    def handle_api_request(self, parsed_path):
        """处理API请求"""
        path = parsed_path.path
        
        try:
            if path == '/api/levels':
                self.handle_levels_request()
            elif path == '/api/progress':
                self.handle_progress_request()
            elif path == '/api/save-progress':
                self.handle_save_progress()
            else:
                self.send_error(404, "API endpoint not found")
        except Exception as e:
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def handle_levels_request(self):
        """返回关卡数据"""
        try:
            with open('levels.json', 'r', encoding='utf-8') as f:
                levels_data = json.load(f)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps(levels_data, ensure_ascii=False, indent=2)
            self.wfile.write(response.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404, "Levels file not found")
        except json.JSONDecodeError:
            self.send_error(500, "Invalid JSON in levels file")
    
    def handle_progress_request(self):
        """返回用户进度数据"""
        try:
            progress_file = 'user_progress.json'
            if os.path.exists(progress_file):
                with open(progress_file, 'r', encoding='utf-8') as f:
                    progress_data = json.load(f)
            else:
                # 默认进度数据
                progress_data = {
                    'completed_levels': [],
                    'current_level': 1,
                    'total_score': 0,
                    'achievements': []
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps(progress_data, ensure_ascii=False, indent=2)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Error loading progress: {str(e)}")
    
    def handle_save_progress(self):
        """保存用户进度"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            progress_data = json.loads(post_data.decode('utf-8'))
            
            # 保存进度到文件
            with open('user_progress.json', 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({'status': 'success', 'message': '进度已保存'}, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Error saving progress: {str(e)}")
    
    def end_headers(self):
        """添加CORS头"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def create_default_levels():
    """创建默认关卡数据（如果不存在）"""
    if not os.path.exists('levels.json'):
        default_levels = [
            {
                "level_id": 1,
                "name": "AND门基础",
                "description": "学习AND门的基本用法",
                "available_gates": ["AND"],
                "fixed_gates": [
                    {"type": "INPUT", "x": 100, "y": 200, "value": False},
                    {"type": "INPUT", "x": 100, "y": 300, "value": False},
                    {"type": "OUTPUT", "x": 500, "y": 250}
                ],
                "target_outputs": [False],
                "truth_table": [
                    {"inputs": [False, False], "output": False},
                    {"inputs": [False, True], "output": False},
                    {"inputs": [True, False], "output": False},
                    {"inputs": [True, True], "output": True}
                ],
                "max_gates": 20,
                "hints": [
                    "AND门只有在所有输入都为真时才输出真",
                    "尝试连接两个输入开关到AND门"
                ]
            }
        ]
        
        with open('levels.json', 'w', encoding='utf-8') as f:
            json.dump(default_levels, f, ensure_ascii=False, indent=2)
        print("已创建默认关卡文件 levels.json")

def main():
    """主函数"""
    # 确保在正确的目录中运行
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # 创建默认关卡文件
    create_default_levels()
    
    # 设置服务器参数
    PORT = 8000
    HOST = '127.0.0.1'
    
    try:
        # 创建服务器
        with socketserver.TCPServer((HOST, PORT), GameHandler) as httpd:
            print(f"🎮 逻辑门闯关：电路解谜实验室")
            print(f"🌐 服务器启动成功！")
            print(f"📍 访问地址: http://{HOST}:{PORT}")
            print(f"📁 服务目录: {os.getcwd()}")
            print(f"🔧 API接口:")
            print(f"   - GET  /api/levels - 获取关卡数据")
            print(f"   - GET  /api/progress - 获取用户进度")
            print(f"   - POST /api/save-progress - 保存用户进度")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {PORT} 已被占用，请尝试其他端口")
        else:
            print(f"❌ 服务器启动失败: {e}")
    except Exception as e:
        print(f"❌ 意外错误: {e}")

if __name__ == "__main__":
    main()