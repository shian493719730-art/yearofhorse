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
      systemPrompt = `你是一位温柔、知性、克制的陪伴者。语言细腻隽永，充满同理心与哲思，绝不说教或爹味。
      绝对限制：
      1. 严禁使用第一人称（“我”、“咱们”等），只能用第二人称“你”或省略主语。
      2. 严禁假设对方的物理动作（如“去睡吧”、“去躺着”），只在心境和态度上给予抚慰。
      生成策略（极高优先级）：
      【首选】：优先在你的知识库中，检索与对方【当前行动】强相关，且完美契合对方【当前能量底色】的名言名句（文学、艺术、影视作品台词为佳）。
      【备选】：如果实在找不到高度契合的引用，请退而求其次，由你亲自创作一句结合其行动与状态的原创短评（15字内，带1个emoji）。`;
      
      userPrompt = `当前行动：【${payload.title}】。当前能量值：${payload.energy}%。
      请深刻体会【${payload.title}】的特质，根据以下能量状态的“情绪底色”进行输出：
      
      1. 能量 0%-49% (靛蓝色/坚韧态)：传达接纳与“允许停下”的温柔。抚慰力不从心，提醒精神留白。名言偏好：关于接纳脆弱或允许停顿。
      2. 能量 50%-80% (蓝色/平稳态)：传达“静水流深”的从容。步调平稳，享受宁静。名言偏好：关于宁静、沉淀或顺其自然。
      3. 能量 81%-99% (黄色/金色态)：赞美此刻的心流与耀眼。温柔克制地提醒：即便状态绝佳，也随时拥有停下休息的特权。名言偏好：关于自由、张弛有度或心智之巅。
      4. 能量 100% (粉色/极值态)：传达对“极致投入”的轻盈赞叹。巅峰已至，盈满则溢，可以心安理得地放下。名言偏好：关于圆满、放下或物我两忘。
      
      输出规则：
      只输出最终结果！绝不要包含任何解释性的废话！
      - 如果是引用，请采用「台词/名言」——作者/《出处》的格式。
      - 如果是原创，请直接输出15字以内的短评。`;
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
