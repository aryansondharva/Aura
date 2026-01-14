import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const GlassPieChart = ({ dataObj }) => {
  const weakCount = dataObj.weak.length;
  const strongCount = dataObj.strong.length;
  const total = weakCount + strongCount;

  // Glass morphism color scheme
  const colors = {
    strong: 'rgb(38, 135, 86)',
    weak: 'rgb(216, 48, 73)',
    border: 'rgba(255, 255, 255, 0.8)',
    bg: 'rgba(255, 255, 255, 0.2)',
    text: 'rgba(255, 255, 255, 0.9)'
  };

  const data = {
    labels: ['Strong Topics', 'Weak Topics'],
    datasets: [{
      data: [strongCount, weakCount],
      backgroundColor: [colors.strong, colors.weak],
      borderColor: colors.border,
      borderWidth: 1,
      hoverBorderWidth: 2,
      hoverBackgroundColor: [
        'rgba(11, 78, 45, 1)',
        'rgba(231, 14, 46, 1)'
      ],
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: colors.text,
          font: {
            size: 14,
            family: "'Inter', sans-serif"
          },
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} topics (${percentage}%)`;
          }
        },
        displayColors: true,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        bodyColor: colors.text,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1
      },
      datalabels: {
        formatter: (value) => Math.round((value / total) * 100) + '%',
        color: colors.text,
        font: {
          size: 14,
          weight: 'bold'
        }
      }
    },
    cutout: '60%'
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '30px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{
        textAlign: 'center',
        marginBottom: '25px',
        color: colors.text,
        fontFamily: "'Inter', sans-serif",
        fontWeight: '500',
        fontSize: '1.4rem'
      }}>
        Topic Performance
      </h3>

      <div style={{ 
        height: '300px', 
        position: 'relative',
        marginBottom: '30px'
      }}>
        <Pie 
          data={data} 
          options={options}
          plugins={[ChartDataLabels]}
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '250px',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <h4 style={{
            color: colors.strong,
            marginTop: 0,
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: colors.strong
            }}></div>
            Strong Topics ({strongCount})
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {dataObj.strong.map((topic, index) => (
              <li key={`strong-${index}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span style={{ color: colors.text }}>{topic.title}</span>
                <span style={{ 
                  color: colors.text,
                  fontWeight: '500'
                }}>
                  {topic.latestScore}/10
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          flex: 1,
          minWidth: '250px',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <h4 style={{
            color: colors.weak,
            marginTop: 0,
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: colors.weak
            }}></div>
            Weak Topics ({weakCount})
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {dataObj.weak.map((topic, index) => (
              <li key={`weak-${index}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span style={{ color: colors.text }}>{topic.title}</span>
                <span style={{ 
                  color: colors.text,
                  fontWeight: '500'
                }}>
                  {topic.latestScore}/10
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GlassPieChart;