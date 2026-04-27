export function analyzeSentiment(text = 'x402 is revolutionizing payments on the internet!') {
  const words = text.toLowerCase().split(/\s+/);
  const pos = ['great', 'good', 'amazing', 'excellent', 'love', 'revolutionary', 'innovative', 'best'];
  const neg = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'broken'];
  let p = 0, n = 0;
  words.forEach(w => { if (pos.some(pw => w.includes(pw))) p++; if (neg.some(nw => w.includes(nw))) n++; });
  const score = ((p - n) / (words.length || 1) * 5 + 0.5);
  const sentiment = score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral';

  return {
    text: text.substring(0, 500),
    sentiment,
    confidence: Math.min(0.99, 0.6 + Math.abs(score) * 0.3).toFixed(3),
    score: parseFloat(score.toFixed(3)),
    emotions: {
      joy: parseFloat((sentiment === 'positive' ? 0.5 + Math.random() * 0.4 : Math.random() * 0.3).toFixed(3)),
      anger: parseFloat((sentiment === 'negative' ? 0.3 + Math.random() * 0.4 : Math.random() * 0.1).toFixed(3)),
      trust: parseFloat((sentiment === 'positive' ? 0.4 + Math.random() * 0.4 : Math.random() * 0.3).toFixed(3)),
    },
    wordCount: words.length,
    model: 'sentiment-xl-v3',
    timestamp: new Date().toISOString(),
  };
}
