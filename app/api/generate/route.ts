import { NextResponse } from 'next/server';

// 1. 设置最大运行时长为 60秒 (防止 DeepSeek 思考时超时)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const getReadableAiError = (message: string) => {
  if (!message) return "AI 服务暂时不可用，请稍后重试";
  if (message.includes("AI_API_KEY")) return "AI_API_KEY 未配置";
  if (message.includes("请求格式无效")) return "AI 请求格式无效";
  if (message.includes("AI返回数据为空")) return "AI 服务返回为空";
  if (message.includes("JSON解析失败")) return "AI 返回格式异常";
  if (message.includes("401")) return "AI 服务鉴权失败";
  if (message.includes("402")) return "AI 服务账户余额不足";
  if (message.includes("429")) return "AI 请求过多或额度已用尽";
  if (message.includes("500")) return "AI 服务端异常，请稍后重试";
  if (message.includes("503")) return "AI 服务暂时不可用，请稍后重试";
  if (message.includes("504")) return "AI 服务超时，请稍后重试";
  if (message.includes("fetch failed")) return "网络请求失败，请检查服务状态";
  return "AI 服务调用失败，请稍后重试";
};

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
      systemPrompt = `你是一个极其护短、说话像微信聊天一样通俗易懂的死党。绝不说教，不熬鸡汤。
      核心原则：完全包容对方的疲惫感，结合对方当前的【具体目标】来帮对方找借口或者夸奖。
      绝对限制：
      1. 严禁在回复中使用第一人称视角（严禁使用“我”、“咱们”等字眼），只能以第二人称“你”或直接省略主语来评价。
      2. 严禁预测或假设对方的物理状态和具体动作（例如不要说“快去躺着”、“快去睡”），只能建议对方“停止、休息、放过自己”。`;
      
      userPrompt = `当前目标：【${payload.title}】。当前能量值：${payload.energy}%。
      请结合【${payload.title}】这个具体目标，并根据以下能量区间，回复一句15字以内的口语化短评（带1个emoji）：
      
      1. 能量 0%-25% (极低)：结合目标直接劝退，建议放弃。例如：“都这么累了还管什么${payload.title}，今天果断歇了吧！☕”
      2. 能量 26%-50% (偏低)：结合目标温柔开脱，建议糊弄。例如：“状态一般就别死磕${payload.title}了，随便应付一下就行。🍃”
      3. 能量 51%-75% (良好)：结合目标轻松肯定，稳步推进。例如：“今天${payload.title}感觉挺顺嘛，保持这个节奏。✨”
      4. 能量 76%-100% (极佳)：结合目标开心捧场，高度赞扬。例如：“精力这么旺盛？今天这${payload.title}肯定能超常发挥！🔥”
      
      注意：直接输出短评，绝不带任何解释或格式，必须在15个字以内。`;
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
    const errorMessage = error?.message || "未知错误";
    const readableError = getReadableAiError(errorMessage);
    
    // 🚨 关键修改：把具体的错误原因返回给前端卡片
    if (requestType === "GENERATE_METRICS") {
         return NextResponse.json([
          { 
            unit: "错误", 
            value: 0, 
            label: "系统报错", 
            desc: readableError
          }
        ]);
    }
    return NextResponse.json({ result: readableError, detail: errorMessage });
  }
}
