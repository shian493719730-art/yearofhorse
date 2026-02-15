import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    console.log("收到请求:", type, payload); // 方便调试

    // 🕵️ 系统人设：极度克制的计算核心
    const systemPrompt = `你是一个辅助人类规划的计算核心。
    原则：
    1. 严禁使用任何主观或情绪化词汇（如“加油”、“或许”、“亲爱的”）。
    2. 严禁输出开场白或解释。
    3. 只输出纯 JSON 数组。
    4. 调用常识库，根据总天数倒推每日的合理工作量。`;

    let userPrompt = "";

    // 🎯 任务一：初创定调 (GENERATE_METRICS)
    if (type === "GENERATE_METRICS") {
      const { title, days } = payload;
      
      userPrompt = `用户目标："${title}"。
      计划总耗时：${days} 天。
      
      请基于常识预估该任务的总量，并将其拆解为 3 种每日执行方案：
      
      1. [结果导向] (如字数、页数、个)。必须根据预估总量除以总天数${days}，计算出每日数值。
      2. [时间导向] (如小时、分钟)。侧重过程投入。
      3. [结构导向] (如章、节、次)。侧重节点完成。
      
      返回格式必须是纯 JSON 数组，不要包含 markdown 标记：
      [
        {"unit": "字", "value": 2000, "desc": "按总量倒推的每日指标"},
        {"unit": "小时", "value": 1.5, "desc": "建议的专注时长"},
        {"unit": "节", "value": 1, "desc": "按部就班"}
      ]`;
    } 
    // 🎯 任务三：实时评述 (LIVE_COMMENT)
    else if (type === "LIVE_COMMENT") {
       userPrompt = `状态标题：${payload.title}，当前能量：${payload.energy}%。
       请写一句非常朴素、像家人一样随口一说的短评。
       要求：不要说教，不要打鸡血，不要用术语。20字以内。`;
    }

    // 调用 AI 接口 (请确保 .env.local 里的变量名正确)
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_URL || "https://api.deepseek.com/chat/completions";

    if (!apiKey) {
      throw new Error("Missing AI_API_KEY");
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", // ⚠️ 如果你用的不是 deepseek，请改成 gpt-3.5-turbo 或其他
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("AI API Error:", errText);
        throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // 数据清洗：去掉可能存在的 Markdown 代码块符号
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    return NextResponse.json({ result: content });

  } catch (error) {
    console.error("Internal AI Error:", error);
    
    // 兜底策略：如果 AI 挂了，返回一套默认数据，保证页面不崩
    if (type === "GENERATE_METRICS") {
         return NextResponse.json({ result: JSON.stringify([
            {"unit": "小时", "value": 1, "desc": "默认时长"},
            {"unit": "次", "value": 1, "desc": "默认频次"},
            {"unit": "页", "value": 5, "desc": "默认进度"}
         ]) });
    }
    return NextResponse.json({ error: 'System Busy' }, { status: 500 });
  }
}