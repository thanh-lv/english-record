import { useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../i18n/LanguageContext';
import { loggerService } from '../../../services/loggerService';

interface UseRecordingOptions {
  user: any;
  profile: any;
  selectedNumber: number | null;
  currentTopic: any;
  activeQuestionIndex: number;
  existingRecordingId?: string | null;
  shadowingVideoId?: string | null;
  onSaveSuccess: (recordings: any[], completedNumber: number | null) => void;
}

export function useRecording({
  user,
  profile,
  selectedNumber,
  currentTopic,
  activeQuestionIndex,
  existingRecordingId,
  shadowingVideoId,
  onSaveSuccess,
}: UseRecordingOptions) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBase64, setAudioBase64] = useState<Blob | null>(null);
  const [bongBeAudios, setBongBeAudios] = useState<Record<number, Blob>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [appError, setAppError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const MAX_RECORDING_SECONDS = 600; // 10 minutes

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const stopRecording = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const startRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording || isSaving) return;
    setAppError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAppError(t.common.micNotSupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      const capturedQuestionIndex = activeQuestionIndex;
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        setBongBeAudios(prev => ({
          ...prev,
          [capturedQuestionIndex]: audioBlob,
        }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setAppError(t.common.micError);
    }
  };

  const saveRecording = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving || !profile?.name) return;

    if (!profile?.teacher_id) {
      setAppError(
        'Tài khoản học sinh chưa được liên kết với giáo viên. Vui lòng liên hệ giáo viên.'
      );
      return;
    }

    const audiosToSave: { questionIndex: number; blob: Blob }[] = Object.entries(bongBeAudios).map(
      ([idx, blob]) => ({
        questionIndex: parseInt(idx),
        blob,
      })
    );

    if (audiosToSave.length === 0) return;

    if (!navigator.onLine) {
      setAppError(t.common.offlineError);
      return;
    }

    setIsSaving(true);
    setAppError('');
    const savedRecordings: any[] = [];

    try {
      const [{ PutObjectCommand }, { getS3Client, S3_BUCKET }] = await Promise.all([
        import('@aws-sdk/client-s3'),
        import('../../../lib/s3'),
      ]);
      const s3Client = await getS3Client();

      let authUserId = user?.id || profile?.auth_user_id || null;
      if (!authUserId || authUserId === 'anonymous') {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.id) {
            authUserId = data.session.user.id;
          } else {
            const anonRes = await supabase.auth.signInAnonymously();
            authUserId = anonRes?.data?.user?.id || null;
          }
        } catch (authErr) {
          console.warn('[useRecording] Anonymous auth check skipped:', authErr);
        }
      }

      const studentFolderId = profile?.id || authUserId || 'student';

      for (const { questionIndex, blob } of audiosToSave) {
        const fileExt = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const prefix = selectedNumber != null ? `topic_${selectedNumber}` : `shadowing`;
        const fileName = `${studentFolderId}/${Date.now()}_${prefix}_q${questionIndex}.${fileExt}`;

        try {
          const s3Command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: new Uint8Array(await blob.arrayBuffer()),
            ContentType: blob.type,
          });
          await s3Client.send(s3Command);
        } catch (s3Err: any) {
          console.error('[useRecording] S3 upload failed:', s3Err);
          loggerService.error('useRecording', 'S3/R2 audio upload error', s3Err);
          throw new Error(s3Err?.message || 'Lỗi tải lên file âm thanh (Cloudflare R2 / S3)', {
            cause: s3Err,
          });
        }

        const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
        let audioUrl = '';
        if (publicBaseUrl) {
          audioUrl = `${publicBaseUrl.replace(/\/$/, '')}/${fileName}`;
        } else {
          const endpoint = import.meta.env.VITE_S3_ENDPOINT || '';
          audioUrl = endpoint.includes(S3_BUCKET)
            ? `${endpoint}/${fileName}`
            : `${endpoint}/${S3_BUCKET}/${fileName}`;
        }

        const questionText = currentTopic?.questions?.[questionIndex]?.text;
        const questionId =
          selectedNumber != null ? currentTopic?.questions?.[questionIndex]?.id : null;
        const topicId = selectedNumber != null ? currentTopic?.id : null;

        const newRecording: Record<string, any> = {
          student_name: profile.name,
          topic: currentTopic.title,
          topic_number: selectedNumber,
          audio_url: audioUrl,
          created_at: new Date().toISOString(),
          question_text: questionText,
          topic_id: topicId,
          question_id: questionId,
          shadowing_video_id: shadowingVideoId ?? null,
          teacher_id: profile.teacher_id,
        };

        if (authUserId && authUserId !== 'anonymous') {
          newRecording.user_id = authUserId;
        }

        if (existingRecordingId) {
          await supabase.from('recordings').delete().eq('id', existingRecordingId);
        }

        let { data, error } = await supabase.from('recordings').insert([newRecording]).select();

        // If error is foreign key violation on user_id (code 23503), retry without user_id
        if (
          error &&
          (error.code === '23503' ||
            error.message?.toLowerCase().includes('user') ||
            error.message?.toLowerCase().includes('foreign key'))
        ) {
          delete newRecording.user_id;
          const retryRes = await supabase.from('recordings').insert([newRecording]).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[useRecording] Supabase insert failed:', error);
          loggerService.error('useRecording', 'Supabase recordings insert error', error);
          throw error;
        }

        if (data && data.length > 0) {
          savedRecordings.push(...data);
        }
      }

      onSaveSuccess(savedRecordings, selectedNumber);
      setBongBeAudios({});
      setAudioBase64(null);
    } catch (error: any) {
      console.error('Error submitting recording:', error);
      loggerService.error('useRecording', 'Error submitting recording', error);
      setAppError(
        error?.message || (navigator.onLine ? t.common.submitError : t.common.offlineError)
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetAudio = () => {
    setAudioBase64(null);
    setBongBeAudios({});
  };

  const hasPendingAudios = Object.keys(bongBeAudios).length > 0;

  return {
    isRecording,
    recordingTime,
    audioBase64,
    setAudioBase64,
    bongBeAudios,
    setBongBeAudios,
    isSaving,
    appError,
    setAppError,
    hasPendingAudios,
    startRecording,
    stopRecording,
    saveRecording,
    resetAudio,
    formatTime,
  };
}
