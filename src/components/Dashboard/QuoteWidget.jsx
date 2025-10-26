import { useState } from 'react';

const QuoteWidget = () => {
  // Hardcoded motivational quote - no API needed, no console spam
  const [quote] = useState({
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  });

  return (
    <div className="flex flex-col">
      <p 
        className="text-base italic"
        style={{
          color: '#ff9b50',
          textShadow: '0 0 10px rgba(255, 155, 80, 0.4), 0 0 20px rgba(255, 155, 80, 0.2)'
        }}
      >
        "{quote.text}"
      </p>
      <p className="text-text-secondary text-sm mt-2">
        {quote.author}
      </p>
    </div>
  );
};

export default QuoteWidget;
