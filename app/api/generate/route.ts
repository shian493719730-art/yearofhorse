import { NextResponse } from 'next/server';

// 1. 设置最大运行时长为 60秒 (防止 DeepSeek 思考时超时)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let requestType = ""; 

  try {
    const body = await req.json();
    let type = body?.type;
    let payload = body?.payload;

    if (!type && typeof body?.title === 'string' && typeof body?.energy !== 'undefined') {
      type = "LIVE_COMMENT";
      payload = { title: body.title, energy: body.energy };
    } else if (!type && typeof body?.title === 'string' && typeof body?.days !== 'undefined') {
      type = "GENERATE_METRICS";
      payload = { title: body.title, days: body.days };
    }

    requestType = type || "";
    if (!type || !payload) {
      throw new Error("请求格式无效");
    }

    // 2. 检查 API Key
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("Vercel后台未配置 AI_API_KEY"); // 这里的报错会直接显示在卡片上
    }

    const apiUrl = "https://api.deepseek.com/chat/completions";

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "GENERATE_METRICS") {
      systemPrompt = `你是一个辅助规划核心。原则：严禁废话，只输出纯JSON数组。`;
      const { title, days } = payload;
      userPrompt = `目标："${title}"，期限：${days}天。
      请拆解 3 种每日方案。
      返回格式必须是纯数组（不要包在对象里）：
      [
        {"unit": "页", "value": 10, "label": "轻量模式", "desc": "积少成多"},
        {"unit": "小时", "value": 1, "label": "标准模式", "desc": "稳步推进"},
        {"unit": "章", "value": 1, "label": "挑战模式", "desc": "全力以赴"}
      ]`;
    } 
    else if (type === "LIVE_COMMENT") {
      systemPrompt = `你是一个温暖的观察者。`;
      userPrompt = `状态：${payload.title}，能量：${payload.energy}%。写一句20字内短评。`;
    }

    // 3. 发送请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        model: "deepseek-chat",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.3
      })
    });

    // 4. 处理 AI 错误响应
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI接口报错: ${response.status} - ${errorText.slice(0, 50)}`);
    }

    const data = await response.json();
    if (!data.choices) throw new Error("AI返回数据为空");

    let content = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();

    if (type === "GENERATE_METRICS") {
      try {
        const parsed = JSON.parse(content);
        // 兼容处理：有些模型喜欢包一层 result
        if (parsed.result && Array.isArray(parsed.result)) return NextResponse.json(parsed.result);
        if (Array.isArray(parsed)) return NextResponse.json(parsed);
        throw new Error("AI返回格式不是数组");
      } catch (e) {
        throw new Error(`JSON解析失败: ${content.slice(0, 30)}...`);
      }
    } else {
      return NextResponse.json({ result: content });
    }

  } catch (error: any) {
    console.error("API Error Details:", error);
    
    // 🚨 关键修改：把具体的错误原因返回给前端卡片
    if (requestType === "GENERATE_METRICS") {
         return NextResponse.json([
          { 
            unit: "错误", 
            value: 0, 
            label: "系统报错", 
            desc: error.message || "未知错误"  // 这里会显示真正的病因
          }
        ]);
    }
    return NextResponse.json({ result: "系统维护中" });
  }
}
