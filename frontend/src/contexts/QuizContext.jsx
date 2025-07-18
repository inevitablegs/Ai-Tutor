import React, { createContext, useState, useContext } from "react";


const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  const [questions, setQuestions] = useState([]); // Add setQuestions
  const [userAnswers, setUserAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [showResults, setShowResults] = useState(false);

  return (
    <QuizContext.Provider
      value={{
        questions,
        setQuestions, // Expose this to context
        userAnswers,
        setUserAnswers,
        current,
        setCurrent,
        showResults,
        setShowResults,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => useContext(QuizContext);
