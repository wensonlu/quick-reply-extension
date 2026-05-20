import { useEffect, useState, type FC } from "react";

interface ToastProps {
  text: string;
  isError?: boolean;
  onDone: () => void;
}

export const Toast: FC<ToastProps> = ({ text, isError, onDone }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onDone, 200);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`toast ${show ? "show" : ""} ${isError ? "error" : ""}`}>
      {text}
    </div>
  );
};
