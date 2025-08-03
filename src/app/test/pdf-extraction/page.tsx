'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { extractVocabularyFromPDF } from '@/lib/pdf/pdf-vision-service';
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary';

export default function PDFExtractionTestPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedWords, setExtractedWords] = useState<ExtractedVocabulary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processedPages, setProcessedPages] = useState<number>(0);

  // TTS 음성 재생 함수
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // 현재 재생 중인 음성이 있으면 중지
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // 영어로 설정
      utterance.rate = 1.0; // 정상 속도
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('이 브라우저는 음성 합성을 지원하지 않습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtractedWords([]);
    setProcessedPages(0);

    try {
      // PDF에서 1-2페이지만 추출 (테스트용)
      const words = await extractVocabularyFromPDF(file, {
        maxPages: 2,
        testMode: true // DB에 저장하지 않음
      });

      setExtractedWords(words);
      setProcessedPages(2);
    } catch (err) {
      console.error('PDF 추출 오류:', err);
      setError(err instanceof Error ? err.message : 'PDF 추출 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>PDF 단어 추출 테스트</CardTitle>
          <CardDescription>
            PDF에서 처음 1-2페이지의 단어만 추출하여 테스트합니다. (DB에 저장하지 않음)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="pdf-upload" className="block text-sm font-medium mb-2">
                PDF 파일 선택
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {isProcessing && (
              <Alert>
                <AlertDescription>
                  PDF를 처리하는 중입니다... 잠시만 기다려주세요.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {processedPages > 0 && (
              <div className="text-sm text-gray-600">
                처리된 페이지: {processedPages}페이지 | 추출된 단어: {extractedWords.length}개
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {extractedWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>추출된 단어 목록</CardTitle>
            <CardDescription>
              V.ZIP 형식으로 추출된 단어들입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extractedWords.map((word, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {index + 1}. {word.word}
                        </h3>
                        <button
                          onClick={() => speakText(word.word)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="단어 발음 듣기"
                        >
                          🔊
                        </button>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {word.partOfSpeech?.map((pos, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {pos}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={word.isSAT ? 'default' : 'outline'}>
                      {word.isSAT ? 'SAT' : 'Non-SAT'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p><strong>한글 뜻:</strong> {word.definition}</p>
                    {word.etymology && (
                      <div className="flex items-start gap-2">
                        <p className="flex-1">
                          <strong>영어 정의:</strong> {word.etymology}
                        </p>
                        <button
                          onClick={() => speakText(word.etymology || '')}
                          className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="영어 정의 듣기"
                        >
                          🔊
                        </button>
                      </div>
                    )}
                    {word.examples && word.examples.length > 0 && (
                      <div className="flex items-start gap-2">
                        <p className="flex-1">
                          <strong>예문:</strong> {word.examples[0]}
                        </p>
                        <button
                          onClick={() => speakText(word.examples[0])}
                          className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="예문 듣기"
                        >
                          🔊
                        </button>
                      </div>
                    )}
                    {word.difficulty && (
                      <p><strong>난이도:</strong> {word.difficulty}/10</p>
                    )}
                    {word.frequency && (
                      <p><strong>빈도:</strong> {word.frequency}/10</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}