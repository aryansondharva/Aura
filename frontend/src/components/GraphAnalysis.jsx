// GraphAnalysis.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { score } = payload[0].payload;
    return (
      <div className="score_info">
        <strong>Attempt #{label}</strong>
        <br />
        Score: <span className="grad_text fw-bold">{score}/10</span>
      </div>
    );
  }
  return null;
};

const GraphAnalysis = ({ history }) => {
  if (!history || !Array.isArray(history)) return null;

  const chartData = [...history]
    .sort((a, b) => {
      const aNum = a.attempt_number ?? 0;
      const bNum = b.attempt_number ?? 0;
      return aNum - bNum;
    })
    .map((attempt, index) => ({
      attempt: attempt.attempt_number ?? index + 1,
      score: attempt.score ?? 0,
    }));

  return (
    <div className="mb-3">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffcb5cff" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ce8d00ff" stopOpacity={0.4} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="attempt" stroke="#fff">
            <Label
              value="Test Attempts"
              offset={-20}
              position="insideBottom"
              fill="#bbb"
            />
          </XAxis>
          <YAxis
            domain={[1, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            stroke="#fff"
          >
            <Label
              value="Score"
              angle={-90}
              position="insideLeft"
              fill="#bbb"
            />
          </YAxis>

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="score"
            stroke="url(#scoreGradient)"
            strokeWidth={3}
            dot={{
              stroke: "#edb437",
              strokeWidth: 1,
              r: 5,
              fill: "#fff",
            }}
            activeDot={{
              stroke: "#fff",
              strokeWidth: 3,
              r: 7,
              fill: "#edb437",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraphAnalysis;
