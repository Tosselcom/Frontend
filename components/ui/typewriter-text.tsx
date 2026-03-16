"use client";

import * as React from "react";
import { useEffect, useState } from "react";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
  highlightWords?: string[];
  highlightClassName?: string;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
  highlightWords,
  highlightClassName = "text-blue-500",
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);

  // Validate and process input text
  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";

  const highlightRanges = React.useMemo(() => {
    const words = (highlightWords ?? []).filter(Boolean);
    if (words.length === 0 || !currentText) return [] as Array<[number, number]>;

    const ranges: Array<[number, number]> = [];
    const lowerText = currentText.toLowerCase();

    for (const word of words) {
      const lowerWord = word.toLowerCase();
      let start = 0;

      while (start < lowerText.length) {
        const index = lowerText.indexOf(lowerWord, start);
        if (index === -1) break;
        ranges.push([index, index + lowerWord.length]);
        start = index + lowerWord.length;
      }
    }

    return ranges;
  }, [currentText, highlightWords]);

  const highlightedContent = React.useMemo(() => {
    if (highlightRanges.length === 0 || displayText.length === 0) return displayText;

    const isHighlightedIndex = (index: number) =>
      highlightRanges.some(([start, end]) => index >= start && index < end);

    const segments: React.ReactNode[] = [];
    let buffer = "";
    let bufferIsHighlighted = isHighlightedIndex(0);

    for (let i = 0; i < displayText.length; i += 1) {
      const highlighted = isHighlightedIndex(i);

      if (highlighted !== bufferIsHighlighted && buffer) {
        segments.push(
          bufferIsHighlighted ? (
            <span key={`segment-${i}`} className={highlightClassName}>
              {buffer}
            </span>
          ) : (
            <React.Fragment key={`segment-${i}`}>{buffer}</React.Fragment>
          ),
        );
        buffer = "";
        bufferIsHighlighted = highlighted;
      }

      buffer += displayText[i];
    }

    if (buffer) {
      segments.push(
        bufferIsHighlighted ? (
          <span key="segment-final" className={highlightClassName}>
            {buffer}
          </span>
        ) : (
          <React.Fragment key="segment-final">{buffer}</React.Fragment>
        ),
      );
    }

    return segments;
  }, [displayText, highlightRanges, highlightClassName]);

  useEffect(() => {
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed,
    );

    return () => clearTimeout(timeout);
  }, [
    currentIndex,
    isDeleting,
    currentText,
    textArray.length,
    loop,
    speed,
    deleteSpeed,
    delay,
    displayText,
  ]);

  return (
    <span className={className}>
      {highlightedContent}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}
