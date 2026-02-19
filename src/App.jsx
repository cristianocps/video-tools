import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { 
  Video, Music, Merge, FolderOpen, Check, AlertCircle, Minus, X,
  Scissors, FileAudio, RefreshCw, Clock, Trash2, Volume2, VolumeX,
  AlertTriangle, Info, Download, Loader2, Globe, Languages, Lock,
  Sun, Moon, Monitor, Github, ListTodo, Play, Pause, XCircle,
  ExternalLink, Folder
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('youtube');
  const [videoPath, setVideoPath] = useState(null);
  const [audioPath, setAudioPath] = useState(null);
  const [outputPath, setOutputPath] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [audioInfo, setAudioInfo] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Extract audio state
  const [extractVideoPath, setExtractVideoPath] = useState(null);
  const [extractOutputPath, setExtractOutputPath] = useState(null);
  
  // Remove audio state
  const [removeAudioVideoPath, setRemoveAudioVideoPath] = useState(null);
  const [removeAudioOutputPath, setRemoveAudioOutputPath] = useState(null);
  
  // YouTube download state
  const [ytUrl, setYtUrl] = useState('');
  const [ytInfo, setYtInfo] = useState(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytAvailable, setYtAvailable] = useState(null);
  const [ytDownloadFolder, setYtDownloadFolder] = useState(null);
  const [selectedVideoFormat, setSelectedVideoFormat] = useState(null);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(null);
  const [ytPassword, setYtPassword] = useState('');
  const [ytNeedsPassword, setYtNeedsPassword] = useState(false);
  const [ytAudioOnly, setYtAudioOnly] = useState(false);
  
  // Theme state: 'system', 'light', 'dark'
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(true);
  
  // Job queue state
  const [jobQueue, setJobQueue] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Theme effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setIsDark(mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (newTheme) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (newTheme === 'system') {
      setIsDark(mediaQuery.matches);
    } else {
      setIsDark(newTheme === 'dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  const cycleTheme = () => {
    const themes = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const newTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return Monitor;
    if (theme === 'light') return Sun;
    return Moon;
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMergeProgress((percent) => {
        setProgress(Math.round(percent));
      });
      
      // Check if yt-dlp is available
      window.electronAPI.youtubeCheck().then(result => {
        setYtAvailable(result.available);
        if (result.available) {
          console.log('yt-dlp version:', result.version);
        }
      });
    }
    // Load recent files from localStorage
    const saved = localStorage.getItem('recentFiles');
    if (saved) {
      setRecentFiles(JSON.parse(saved));
    }
    // Load download folder from localStorage
    const savedFolder = localStorage.getItem('ytDownloadFolder');
    if (savedFolder) {
      setYtDownloadFolder(savedFolder);
    }
  }, []);

  const addToRecent = (file, type) => {
    const newRecent = [
      { path: file, type, date: new Date().toISOString() },
      ...recentFiles.filter(f => f.path !== file).slice(0, 9)
    ];
    setRecentFiles(newRecent);
    localStorage.setItem('recentFiles', JSON.stringify(newRecent));
  };

  const notify = (title, body, type = 'info') => {
    if (window.electronAPI?.showNotification) {
      window.electronAPI.showNotification({ title, body, type });
    }
  };

  // Job Queue Functions
  const addToQueue = (job) => {
    const newJob = {
      id: Date.now(),
      ...job,
      status: 'pending',
      progress: 0,
      addedAt: new Date().toISOString()
    };
    setJobQueue(prev => [...prev, newJob]);
    notify('Job Added', `${job.name} added to queue`, 'info');
    return newJob.id;
  };

  const removeFromQueue = (jobId) => {
    setJobQueue(prev => prev.filter(j => j.id !== jobId));
  };

  const clearQueue = () => {
    setJobQueue(prev => prev.filter(j => j.status === 'processing'));
  };

  const processNextJob = useCallback(async () => {
    const nextJob = jobQueue.find(j => j.status === 'pending');
    if (!nextJob || currentJob) return;
    
    setCurrentJob(nextJob);
    setJobQueue(prev => prev.map(j => 
      j.id === nextJob.id ? { ...j, status: 'processing' } : j
    ));
    
    try {
      let result;
      switch (nextJob.type) {
        case 'merge':
          result = await window.electronAPI.mergeVideoAudio(nextJob.params);
          break;
        case 'extract':
          result = await window.electronAPI.extractAudio(nextJob.params);
          break;
        case 'remove':
          result = await window.electronAPI.removeAudio(nextJob.params);
          break;
        case 'download':
          result = await window.electronAPI.youtubeDownload(nextJob.params);
          break;
        default:
          throw new Error('Unknown job type');
      }
      
      if (result.success) {
        setJobQueue(prev => prev.map(j => 
          j.id === nextJob.id ? { ...j, status: 'completed', progress: 100 } : j
        ));
        addToRecent(nextJob.outputPath || result.outputFile, nextJob.type);
        notify(`${nextJob.name} Complete`, 'Job completed successfully!', 'success');
      } else {
        setJobQueue(prev => prev.map(j => 
          j.id === nextJob.id ? { ...j, status: 'error', error: result.message } : j
        ));
        notify(`${nextJob.name} Failed`, result.message, 'error');
      }
    } catch (err) {
      setJobQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { ...j, status: 'error', error: err.message } : j
      ));
      notify(`${nextJob.name} Failed`, err.message, 'error');
    } finally {
      setCurrentJob(null);
    }
  }, [jobQueue, currentJob]);

  // Process queue when jobs are added or current job finishes
  useEffect(() => {
    if (isProcessingQueue && !currentJob) {
      const pendingJobs = jobQueue.filter(j => j.status === 'pending');
      if (pendingJobs.length > 0) {
        processNextJob();
      } else {
        setIsProcessingQueue(false);
      }
    }
  }, [isProcessingQueue, currentJob, jobQueue, processNextJob]);

  // Update current job progress
  useEffect(() => {
    if (currentJob && progress > 0) {
      setJobQueue(prev => prev.map(j => 
        j.id === currentJob.id ? { ...j, progress } : j
      ));
    }
  }, [progress, currentJob]);

  const startQueue = () => {
    setIsProcessingQueue(true);
    if (!currentJob) {
      processNextJob();
    }
  };

  const pauseQueue = () => {
    setIsProcessingQueue(false);
  };

  // Add specific job types to queue
  const addMergeToQueue = () => {
    if (!videoPath || !audioPath || !outputPath) return;
    addToQueue({
      type: 'merge',
      name: `Merge: ${getFileName(videoPath)}`,
      params: { videoPath, audioPath, outputPath },
      outputPath
    });
    reset();
  };

  const addExtractToQueue = () => {
    if (!extractVideoPath || !extractOutputPath) return;
    addToQueue({
      type: 'extract',
      name: `Extract: ${getFileName(extractVideoPath)}`,
      params: { videoPath: extractVideoPath, outputPath: extractOutputPath },
      outputPath: extractOutputPath
    });
    setExtractVideoPath(null);
    setExtractOutputPath(null);
  };

  const addRemoveToQueue = () => {
    if (!removeAudioVideoPath || !removeAudioOutputPath) return;
    addToQueue({
      type: 'remove',
      name: `Remove Audio: ${getFileName(removeAudioVideoPath)}`,
      params: { videoPath: removeAudioVideoPath, outputPath: removeAudioOutputPath },
      outputPath: removeAudioOutputPath
    });
    setRemoveAudioVideoPath(null);
    setRemoveAudioOutputPath(null);
  };

  const addDownloadToQueue = () => {
    if (!ytInfo || !ytDownloadFolder) return;
    const audioFormatId = selectedAudioTrack?.formats?.[0]?.formatId;
    addToQueue({
      type: 'download',
      name: `Download: ${ytInfo.title?.substring(0, 40)}...`,
      params: {
        url: ytInfo.url,
        videoFormatId: ytAudioOnly ? null : selectedVideoFormat?.formatId,
        audioFormatId: audioFormatId,
        outputFolder: ytDownloadFolder,
        filename: ytInfo.title,
        mergeAudio: !ytAudioOnly && selectedVideoFormat && audioFormatId,
        audioOnly: ytAudioOnly,
        password: ytPassword || null
      },
      outputPath: ytDownloadFolder + '/' + ytInfo.title
    });
    resetYt();
  };

  const clearRecent = () => {
    setRecentFiles([]);
    localStorage.removeItem('recentFiles');
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e, type) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const filePath = files[0].path;
      if (type === 'video') {
        setVideoPath(filePath);
        await getVideoInfo(filePath);
      } else if (type === 'audio') {
        setAudioPath(filePath);
        await getAudioInfo(filePath);
      } else if (type === 'extractVideo') {
        setExtractVideoPath(filePath);
      } else if (type === 'removeAudioVideo') {
        setRemoveAudioVideoPath(filePath);
      }
    }
  };

  const getVideoInfo = async (path) => {
    if (!window.electronAPI) return;
    try {
      const info = await window.electronAPI.getVideoInfo(path);
      setVideoInfo(info);
    } catch (err) {
      console.error('Could not get video info:', err);
    }
  };

  const getAudioInfo = async (path) => {
    if (!window.electronAPI) return;
    try {
      const info = await window.electronAPI.getAudioInfo(path);
      setAudioInfo(info);
    } catch (err) {
      console.error('Could not get audio info:', err);
    }
  };

  const selectVideo = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectVideo();
    if (path) {
      setVideoPath(path);
      await getVideoInfo(path);
    }
  };

  const selectAudio = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectAudio();
    if (path) {
      setAudioPath(path);
      await getAudioInfo(path);
    }
  };

  const selectOutput = async () => {
    if (!window.electronAPI) return;
    const defaultName = videoPath 
      ? videoPath.replace(/\.[^/.]+$/, '') + '_with_audio.mp4'
      : 'output.mp4';
    const path = await window.electronAPI.selectOutput(defaultName);
    if (path) {
      setOutputPath(path);
    }
  };

  const mergeFiles = async () => {
    if (!videoPath || !audioPath || !outputPath) {
      setMessage('Please select all files first');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setProgress(0);
    setMessage('');

    try {
      const result = await window.electronAPI.mergeVideoAudio({
        videoPath,
        audioPath,
        outputPath
      });
      
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setProgress(100);
        addToRecent(outputPath, 'merge');
        notify('Merge Complete', 'Video and audio have been merged successfully!', 'success');
      } else {
        setStatus('error');
        setMessage(result.message || 'Merge failed');
        notify('Merge Failed', result.message || 'An error occurred during merge', 'error');
      }
    } catch (err) {
      setStatus('error');
      const errorMsg = typeof err === 'object' 
        ? (err.message || JSON.stringify(err)) 
        : String(err);
      setMessage(errorMsg || 'An error occurred during merge');
      notify('Merge Failed', errorMsg || 'An error occurred during merge', 'error');
    }
  };

  // Extract audio functions
  const selectExtractVideo = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectVideo();
    if (path) {
      setExtractVideoPath(path);
    }
  };

  const selectExtractOutput = async () => {
    if (!window.electronAPI) return;
    const defaultName = extractVideoPath 
      ? extractVideoPath.replace(/\.[^/.]+$/, '') + '.mp3'
      : 'audio.mp3';
    const path = await window.electronAPI.selectAudioOutput(defaultName);
    if (path) {
      setExtractOutputPath(path);
    }
  };

  const extractAudio = async () => {
    if (!extractVideoPath || !extractOutputPath) {
      setMessage('Please select all files first');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setProgress(0);
    setMessage('');

    try {
      const result = await window.electronAPI.extractAudio({
        videoPath: extractVideoPath,
        outputPath: extractOutputPath
      });
      
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setProgress(100);
        addToRecent(extractOutputPath, 'extract');
        notify('Extraction Complete', 'Audio has been extracted successfully!', 'success');
      } else {
        setStatus('error');
        setMessage(result.message || 'Extraction failed');
        notify('Extraction Failed', result.message || 'An error occurred', 'error');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'An error occurred');
      notify('Extraction Failed', err.message || 'An error occurred', 'error');
    }
  };

  // Remove audio functions
  const selectRemoveAudioVideo = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectVideo();
    if (path) {
      setRemoveAudioVideoPath(path);
    }
  };

  const selectRemoveAudioOutput = async () => {
    if (!window.electronAPI) return;
    const defaultName = removeAudioVideoPath 
      ? removeAudioVideoPath.replace(/\.[^/.]+$/, '') + '_no_audio.mp4'
      : 'video_no_audio.mp4';
    const path = await window.electronAPI.selectOutput(defaultName);
    if (path) {
      setRemoveAudioOutputPath(path);
    }
  };

  const removeAudio = async () => {
    if (!removeAudioVideoPath || !removeAudioOutputPath) {
      setMessage('Please select all files first');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setProgress(0);
    setMessage('');

    try {
      const result = await window.electronAPI.removeAudio({
        videoPath: removeAudioVideoPath,
        outputPath: removeAudioOutputPath
      });
      
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setProgress(100);
        addToRecent(removeAudioOutputPath, 'remove');
        notify('Audio Removed', 'Audio track has been removed successfully!', 'success');
      } else {
        setStatus('error');
        setMessage(result.message || 'Remove audio failed');
        notify('Remove Audio Failed', result.message || 'An error occurred', 'error');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'An error occurred');
      notify('Remove Audio Failed', err.message || 'An error occurred', 'error');
    }
  };

  const reset = () => {
    setVideoPath(null);
    setAudioPath(null);
    setOutputPath(null);
    setExtractVideoPath(null);
    setExtractOutputPath(null);
    setRemoveAudioVideoPath(null);
    setRemoveAudioOutputPath(null);
    setProgress(0);
    setStatus('idle');
    setMessage('');
    setVideoInfo(null);
    setAudioInfo(null);
  };

  // YouTube functions
  const fetchYtInfo = async (usePassword = false) => {
    if (!ytUrl.trim()) {
      setMessage('Please enter a video URL');
      setStatus('error');
      return;
    }
    
    if (usePassword && !ytPassword.trim()) {
      setMessage('Please enter the password');
      setStatus('error');
      return;
    }
    
    setYtLoading(true);
    setYtInfo(null);
    setMessage('');
    setStatus('idle');
    
    try {
      const password = usePassword ? ytPassword : null;
      const result = await window.electronAPI.youtubeGetInfo(ytUrl, password);
      
      if (result.success) {
        setYtInfo(result.info);
        setYtNeedsPassword(false);
        // Keep password for download - don't clear it
        // Auto-select best video format
        if (result.info.videoFormats?.length > 0) {
          setSelectedVideoFormat(result.info.videoFormats[0]);
        }
        // Auto-select first audio track
        if (result.info.audioTracks?.length > 0) {
          setSelectedAudioTrack(result.info.audioTracks[0]);
        }
      } else if (result.needsPassword) {
        setYtNeedsPassword(true);
        setMessage(result.message);
        setStatus('idle');
      } else {
        setMessage(result.message || 'Failed to get video info');
        setStatus('error');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to fetch video info');
      setStatus('error');
    } finally {
      setYtLoading(false);
    }
  };

  const selectDownloadFolder = async () => {
    const folder = await window.electronAPI.selectDownloadFolder();
    if (folder) {
      setYtDownloadFolder(folder);
      localStorage.setItem('ytDownloadFolder', folder);
    }
  };

  const downloadYtVideo = async () => {
    if (!ytInfo || !ytDownloadFolder) {
      setMessage('Please fetch video info and select download folder');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setProgress(0);
    setMessage('');

    try {
      const audioFormatId = selectedAudioTrack?.formats?.[0]?.formatId;
      
      const result = await window.electronAPI.youtubeDownload({
        url: ytInfo.url,
        videoFormatId: ytAudioOnly ? null : selectedVideoFormat?.formatId,
        audioFormatId: audioFormatId,
        outputFolder: ytDownloadFolder,
        filename: ytInfo.title,
        mergeAudio: !ytAudioOnly && selectedVideoFormat && audioFormatId,
        audioOnly: ytAudioOnly,
        password: ytPassword || null
      });

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setProgress(100);
        addToRecent(result.outputFile || ytDownloadFolder + '/' + ytInfo.title + '.mp4', 'download');
        notify('Download Complete', `"${ytInfo.title}" has been downloaded!`, 'success');
      } else {
        setStatus('error');
        setMessage(result.message || 'Download failed');
        notify('Download Failed', result.message || 'An error occurred', 'error');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'An error occurred during download');
      notify('Download Failed', err.message || 'An error occurred', 'error');
    }
  };

  const resetYt = () => {
    setYtUrl('');
    setYtInfo(null);
    setSelectedVideoFormat(null);
    setSelectedAudioTrack(null);
    setYtPassword('');
    setYtNeedsPassword(false);
    setYtAudioOnly(false);
    setProgress(0);
    setStatus('idle');
    setMessage('');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileName = (path) => {
    if (!path) return null;
    return path.split(/[/\\]/).pop();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate duration difference and status
  const getDurationComparison = () => {
    if (!videoInfo?.duration || !audioInfo?.duration) return null;
    
    const videoDuration = videoInfo.duration;
    const audioDuration = audioInfo.duration;
    const diff = Math.abs(videoDuration - audioDuration);
    const diffPercent = (diff / videoDuration) * 100;
    
    if (diff < 1) {
      return { 
        status: 'match', 
        message: 'Durations match perfectly!',
        icon: Check,
        darkColor: 'text-green-400',
        lightColor: 'text-green-700',
        darkBg: 'bg-green-900/30 border-green-700',
        lightBg: 'bg-green-50 border-green-300'
      };
    } else if (diffPercent < 5) {
      return { 
        status: 'close', 
        message: `Durations are close (${formatDuration(diff)} difference)`,
        icon: Info,
        darkColor: 'text-blue-400',
        lightColor: 'text-blue-700',
        darkBg: 'bg-blue-900/30 border-blue-700',
        lightBg: 'bg-blue-50 border-blue-300'
      };
    } else if (audioDuration > videoDuration) {
      return { 
        status: 'audio-longer', 
        message: `Audio is ${formatDuration(diff)} longer than video. Audio will be trimmed.`,
        icon: AlertTriangle,
        darkColor: 'text-yellow-400',
        lightColor: 'text-amber-700',
        darkBg: 'bg-yellow-900/30 border-yellow-700',
        lightBg: 'bg-amber-50 border-amber-400'
      };
    } else {
      return { 
        status: 'video-longer', 
        message: `Video is ${formatDuration(diff)} longer than audio. Video may have silence at the end.`,
        icon: AlertTriangle,
        darkColor: 'text-yellow-400',
        lightColor: 'text-amber-700',
        darkBg: 'bg-yellow-900/30 border-yellow-700',
        lightBg: 'bg-amber-50 border-amber-400'
      };
    }
  };

  const durationComparison = getDurationComparison();

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.windowClose();
    }
  };

  const pendingJobsCount = jobQueue.filter(j => j.status === 'pending' || j.status === 'processing').length;
  
  const tabs = [
    { id: 'youtube', label: 'Download', icon: Download },
    { id: 'merge', label: 'Merge', icon: Merge },
    { id: 'extract', label: 'Extract', icon: FileAudio },
    { id: 'remove', label: 'Remove Audio', icon: VolumeX },
    { id: 'queue', label: 'Queue', icon: ListTodo, badge: pendingJobsCount > 0 ? pendingJobsCount : null },
    { id: 'history', label: 'History', icon: Clock },
  ];

  const ThemeIcon = getThemeIcon();
  
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'
    }`}>
      {/* Custom Title Bar */}
      <div 
        className={`flex items-center justify-between px-4 py-2 border-b transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'
        }`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
          <Video className="w-4 h-4 text-purple-500" />
          <span className="hidden sm:inline">Simple But Honest</span> Video Tools
        </div>
        <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={cycleTheme}
            className={`p-1.5 rounded transition-colors ${
              isDark 
                ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleMinimize}
            className={`p-1.5 rounded transition-colors ${
              isDark 
                ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded hover:bg-red-600 transition-colors ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            } hover:text-white`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b overflow-x-auto ${
        isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-white/50'
      }`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setStatus('idle'); setMessage(''); setActiveTab(tab.id); }}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap
                ${activeTab === tab.id 
                  ? `text-purple-500 border-b-2 border-purple-500 ${isDark ? 'bg-slate-800/50' : 'bg-purple-50'}` 
                  : `${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        {/* YouTube Tab */}
        {activeTab === 'youtube' && (
          <Card className={`w-full max-w-3xl border backdrop-blur ${
            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'
          }`}>
            <CardHeader className="text-center pb-2">
              <CardTitle className={`text-lg font-bold flex items-center justify-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                <Download className="w-5 h-5 text-purple-500" />
                Video Download
              </CardTitle>
              <CardDescription className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                YouTube, Vimeo, Twitter, TikTok & 1000+ sites
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {ytAvailable === false && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-amber-50 border-amber-400'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-amber-600'}`} />
                  <div className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-amber-700'}`}>
                    <p>yt-dlp not found. Installing on first use...</p>
                  </div>
                </div>
              )}

              {/* URL Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ytUrl}
                  onChange={(e) => { setYtUrl(e.target.value); setYtNeedsPassword(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && !ytNeedsPassword && fetchYtInfo()}
                  placeholder="Paste video URL (YouTube, Vimeo, Twitter, etc.)..."
                  className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark 
                      ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' 
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                  disabled={ytLoading || status === 'processing'}
                />
                <Button 
                  onClick={() => fetchYtInfo(false)}
                  disabled={ytLoading || status === 'processing' || !ytUrl.trim() || ytNeedsPassword}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {ytLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Password Input (shown when needed) */}
              {ytNeedsPassword && (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                    isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-amber-50 border-amber-400'
                  }`}>
                    <Lock className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-amber-600'}`} />
                    <p className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-amber-700'}`}>This video is password protected</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={ytPassword}
                      onChange={(e) => setYtPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && ytPassword.trim() && fetchYtInfo(true)}
                      placeholder="Enter video password..."
                      className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                        isDark 
                          ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                      }`}
                      disabled={ytLoading || status === 'processing'}
                      autoFocus
                    />
                    <Button 
                      onClick={() => fetchYtInfo(true)}
                      disabled={ytLoading || status === 'processing' || !ytPassword.trim()}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {ytLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-1" />
                          Unlock
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Video Info */}
              {ytInfo && (
                <div className="space-y-3">
                  {/* Video Preview */}
                  <div className={`flex gap-3 p-3 rounded-lg border ${
                    isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {ytInfo.thumbnail && (
                      <img 
                        src={ytInfo.thumbnail} 
                        alt={ytInfo.title}
                        className="w-28 h-16 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{ytInfo.title}</h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ytInfo.channel} • {formatDuration(ytInfo.duration)}</p>
                    </div>
                  </div>

                  {/* Download Mode Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setYtAudioOnly(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
                        !ytAudioOnly
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : isDark 
                            ? 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700' 
                            : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span className="text-sm">Video + Audio</span>
                    </button>
                    <button
                      onClick={() => setYtAudioOnly(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
                        ytAudioOnly
                          ? 'bg-green-600 border-green-500 text-white'
                          : isDark 
                            ? 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700' 
                            : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Music className="w-4 h-4" />
                      <span className="text-sm">Audio Only (MP3)</span>
                    </button>
                  </div>

                  {/* Video Format Selection - only show if not audio only */}
                  {!ytAudioOnly && (
                  <div className="space-y-2">
                    <label className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Video className="w-4 h-4" />
                      Video Quality
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto">
                      {ytInfo.videoFormats?.map((format) => (
                        <button
                          key={format.formatId}
                          onClick={() => setSelectedVideoFormat(format)}
                          className={`p-1.5 text-xs rounded border transition-colors ${
                            selectedVideoFormat?.formatId === format.formatId
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : isDark 
                                ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700' 
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-medium">{format.resolution}</div>
                          <div className={`text-[10px] ${selectedVideoFormat?.formatId === format.formatId ? 'text-blue-200' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>{format.fps}fps</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Audio Track Selection */}
                  {ytInfo.audioTracks?.length > 0 && (
                    <div className="space-y-2">
                      <label className={`text-sm flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Languages className="w-4 h-4" />
                        Audio Track ({ytInfo.audioTracks.length} available)
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {ytInfo.audioTracks?.map((track) => (
                          <button
                            key={track.language}
                            onClick={() => setSelectedAudioTrack(track)}
                            className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                              selectedAudioTrack?.language === track.language
                                ? 'bg-green-600 border-green-500 text-white'
                                : isDark 
                                  ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700' 
                                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <Music className="w-3 h-3" />
                              {track.language === 'default' ? 'Original' : track.language.toUpperCase()}
                              {track.formats?.[0] && (
                                <span className={selectedAudioTrack?.language === track.language ? 'text-green-200' : isDark ? 'text-slate-400' : 'text-slate-500'}>
                                  ({track.formats[0].abr}kbps)
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download Folder */}
                  <Button 
                    variant="outline" 
                    className={`w-full justify-start ${
                      isDark 
                        ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                        : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={selectDownloadFolder}
                    disabled={status === 'processing'}
                  >
                    <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                    {ytDownloadFolder ? ytDownloadFolder.split(/[/\\]/).slice(-2).join('/') : 'Select download folder'}
                  </Button>

                  {/* Selection Summary */}
                  {(selectedVideoFormat || selectedAudioTrack || ytAudioOnly) && (
                    <div className={`p-2 rounded-lg border text-xs ${
                      isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`flex flex-wrap gap-x-4 gap-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {!ytAudioOnly && selectedVideoFormat && (
                          <span>Video: {selectedVideoFormat.resolution} @ {selectedVideoFormat.fps}fps</span>
                        )}
                        {selectedAudioTrack && (
                          <span>Audio: {selectedAudioTrack.language === 'default' ? 'Original' : selectedAudioTrack.language} ({selectedAudioTrack.formats?.[0]?.abr}kbps)</span>
                        )}
                        {ytAudioOnly ? (
                          <span className="text-green-400">→ MP3 Audio File</span>
                        ) : selectedVideoFormat && selectedAudioTrack && (
                          <span className="text-blue-400">→ Merged MP4</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className={`h-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Downloading... {progress}%
                  </p>
                </div>
              )}

              {/* Status Messages */}
              {status === 'success' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300'
                }`}>
                  <Check className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>{message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {status === 'success' ? (
                  <Button 
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={resetYt}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Download Another
                  </Button>
                ) : ytInfo && (
                  <>
                    <Button 
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={downloadYtVideo}
                      disabled={!ytDownloadFolder || status === 'processing'}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Now
                    </Button>
                    <Button 
                      variant="outline"
                      className={`${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'}`}
                      onClick={addDownloadToQueue}
                      disabled={!ytDownloadFolder || status === 'processing'}
                    >
                      <ListTodo className="w-4 h-4 mr-1" />
                      Queue
                    </Button>
                    <Button 
                      variant="ghost"
                      className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500'}
                      onClick={resetYt}
                      disabled={status === 'processing'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Supported Sites Info */}
              {!ytInfo && !ytLoading && (
                <div className="text-center text-xs text-slate-500 pt-2">
                  <p>Supported: YouTube, Vimeo, Twitter/X, TikTok, Instagram, Facebook, Twitch, Dailymotion, and 1000+ more sites</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Merge Tab */}
        {activeTab === 'merge' && (
          <Card className={`w-full max-w-lg border backdrop-blur ${
            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'
          }`}>
            <CardHeader className="text-center">
              <CardTitle className={`text-xl font-bold flex items-center justify-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                <Merge className="w-5 h-5 text-blue-500" />
                Merge Audio & Video
              </CardTitle>
              <CardDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Add an audio track to your video
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Video Selection */}
              <div 
                className={`space-y-2 ${isDragging ? 'opacity-70' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'video')}
              >
                <Button 
                  variant="outline" 
                  className={`w-full justify-start border-dashed ${
                    isDark 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  onClick={selectVideo}
                  disabled={status === 'processing'}
                >
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                  {videoPath ? getFileName(videoPath) : 'Select or drop video file'}
                </Button>
                {videoInfo && (
                  <div className={`flex gap-4 text-xs pl-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Duration: {formatDuration(videoInfo.duration)}</span>
                    <span className={videoInfo.hasAudio ? (isDark ? 'text-yellow-400' : 'text-amber-700 font-medium') : (isDark ? 'text-green-400' : 'text-green-700 font-medium')}>
                      {videoInfo.hasAudio ? '⚠ Has audio (will be replaced)' : '✓ No audio'}
                    </span>
                  </div>
                )}
              </div>

              {/* Audio Selection */}
              <div
                className="space-y-2"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'audio')}
              >
                <Button 
                  variant="outline" 
                  className={`w-full justify-start border-dashed ${
                    isDark 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  onClick={selectAudio}
                  disabled={status === 'processing'}
                >
                  <Music className="w-4 h-4 mr-2 text-green-400" />
                  {audioPath ? getFileName(audioPath) : 'Select or drop audio file'}
                </Button>
                {audioInfo && (
                  <div className={`flex gap-4 text-xs pl-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Duration: {formatDuration(audioInfo.duration)}</span>
                    {audioInfo.codec && (
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Codec: {audioInfo.codec.toUpperCase()}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Duration Comparison */}
              {durationComparison && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${isDark ? durationComparison.darkBg : durationComparison.lightBg}`}>
                  <durationComparison.icon className={`w-5 h-5 flex-shrink-0 ${isDark ? durationComparison.darkColor : durationComparison.lightColor}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${isDark ? durationComparison.darkColor : durationComparison.lightColor}`}>{durationComparison.message}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Video: {formatDuration(videoInfo?.duration)} | Audio: {formatDuration(audioInfo?.duration)}
                    </p>
                  </div>
                </div>
              )}

              {/* Output Selection */}
              <Button 
                variant="outline" 
                className={`w-full justify-start ${
                  isDark 
                    ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
                onClick={selectOutput}
                disabled={status === 'processing'}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                {outputPath ? getFileName(outputPath) : 'Select output location'}
              </Button>

              {/* Progress Bar */}
              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className={`h-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Processing... {progress}%
                  </p>
                </div>
              )}

              {/* Status Messages */}
              {status === 'success' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300'
                }`}>
                  <Check className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>{message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {status === 'success' ? (
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={reset}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Another
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={mergeFiles}
                        disabled={!videoPath || !audioPath || !outputPath || status === 'processing'}
                      >
                        <Merge className="w-4 h-4 mr-2" />
                        Merge Now
                      </Button>
                      <Button 
                        variant="outline"
                        className={`${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'}`}
                        onClick={addMergeToQueue}
                        disabled={!videoPath || !audioPath || !outputPath || status === 'processing'}
                      >
                        <ListTodo className="w-4 h-4 mr-1" />
                        Queue
                      </Button>
                    </div>
                    {(videoPath || audioPath || outputPath) && status !== 'processing' && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}
                        onClick={reset}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extract Audio Tab */}
        {activeTab === 'extract' && (
          <Card className={`w-full max-w-lg border backdrop-blur ${
            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'
          }`}>
            <CardHeader className="text-center">
              <CardTitle className={`text-xl font-bold flex items-center justify-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                <FileAudio className="w-5 h-5 text-green-500" />
                Extract Audio
              </CardTitle>
              <CardDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Extract audio track from a video file
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'extractVideo')}
              >
                <Button 
                  variant="outline" 
                  className={`w-full justify-start border-dashed ${
                    isDark 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  onClick={selectExtractVideo}
                  disabled={status === 'processing'}
                >
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                  {extractVideoPath ? getFileName(extractVideoPath) : 'Select or drop video file'}
                </Button>
              </div>

              <Button 
                variant="outline" 
                className={`w-full justify-start ${
                  isDark 
                    ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
                onClick={selectExtractOutput}
                disabled={status === 'processing'}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                {extractOutputPath ? getFileName(extractOutputPath) : 'Select output location (.mp3)'}
              </Button>

              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className={`h-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Extracting... {progress}%</p>
                </div>
              )}

              {status === 'success' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300'
                }`}>
                  <Check className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>{message}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {status === 'success' ? (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Extract Another
                  </Button>
                ) : (
                  <>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={extractAudio}
                      disabled={!extractVideoPath || !extractOutputPath || status === 'processing'}
                    >
                      <FileAudio className="w-4 h-4 mr-2" />
                      Extract Now
                    </Button>
                    <Button 
                      variant="outline"
                      className={`${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'}`}
                      onClick={addExtractToQueue}
                      disabled={!extractVideoPath || !extractOutputPath || status === 'processing'}
                    >
                      <ListTodo className="w-4 h-4 mr-1" />
                      Queue
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Remove Audio Tab */}
        {activeTab === 'remove' && (
          <Card className={`w-full max-w-lg border backdrop-blur ${
            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'
          }`}>
            <CardHeader className="text-center">
              <CardTitle className={`text-xl font-bold flex items-center justify-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                <VolumeX className="w-5 h-5 text-orange-500" />
                Remove Audio
              </CardTitle>
              <CardDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Remove audio track from a video file
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'removeAudioVideo')}
              >
                <Button 
                  variant="outline" 
                  className={`w-full justify-start border-dashed ${
                    isDark 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  onClick={selectRemoveAudioVideo}
                  disabled={status === 'processing'}
                >
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                  {removeAudioVideoPath ? getFileName(removeAudioVideoPath) : 'Select or drop video file'}
                </Button>
              </div>

              <Button 
                variant="outline" 
                className={`w-full justify-start ${
                  isDark 
                    ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white' 
                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
                onClick={selectRemoveAudioOutput}
                disabled={status === 'processing'}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                {removeAudioOutputPath ? getFileName(removeAudioOutputPath) : 'Select output location'}
              </Button>

              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className={`h-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Processing... {progress}%</p>
                </div>
              )}

              {status === 'success' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300'
                }`}>
                  <Check className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>{message}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {status === 'success' ? (
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Another
                  </Button>
                ) : (
                  <>
                    <Button 
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      onClick={removeAudio}
                      disabled={!removeAudioVideoPath || !removeAudioOutputPath || status === 'processing'}
                    >
                      <VolumeX className="w-4 h-4 mr-2" />
                      Remove Now
                    </Button>
                    <Button 
                      variant="outline"
                      className={`${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'}`}
                      onClick={addRemoveToQueue}
                      disabled={!removeAudioVideoPath || !removeAudioOutputPath || status === 'processing'}
                    >
                      <ListTodo className="w-4 h-4 mr-1" />
                      Queue
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <Card className={`w-full max-w-2xl border backdrop-blur ${
            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  <ListTodo className="w-5 h-5 text-purple-500" />
                  Job Queue
                </CardTitle>
                <div className="flex gap-2">
                  {jobQueue.filter(j => j.status === 'pending').length > 0 && (
                    <>
                      {isProcessingQueue ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={pauseQueue}
                          className={isDark ? 'border-slate-600' : 'border-slate-300'}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={startQueue}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                    </>
                  )}
                  {jobQueue.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={clearQueue}
                      className={isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-500'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {jobQueue.length === 0 
                  ? 'No jobs in queue' 
                  : `${jobQueue.filter(j => j.status === 'pending').length} pending, ${jobQueue.filter(j => j.status === 'processing').length} processing`
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {jobQueue.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Queue is empty</p>
                  <p className="text-sm mt-1">Add jobs from other tabs to process them in batch</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {jobQueue.map((job) => (
                    <div 
                      key={job.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        job.status === 'completed' ? 'bg-green-500/20' :
                        job.status === 'error' ? 'bg-red-500/20' :
                        job.status === 'processing' ? 'bg-purple-500/20' : 'bg-slate-500/20'
                      }`}>
                        {job.status === 'completed' ? <Check className="w-4 h-4 text-green-400" /> :
                         job.status === 'error' ? <XCircle className="w-4 h-4 text-red-400" /> :
                         job.status === 'processing' ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" /> :
                         <Clock className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{job.name}</p>
                        {job.status === 'processing' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={job.progress || 0} className="h-1.5 flex-1" />
                            <span className="text-xs text-purple-400">{job.progress || 0}%</span>
                          </div>
                        ) : (
                          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {job.status === 'error' ? job.error : job.type}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {job.status === 'completed' && job.outputPath && (
                          <>
                            <button
                              onClick={() => window.electronAPI?.showInFolder(job.outputPath)}
                              className={`p-1 rounded transition-colors ${
                                isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                              }`}
                              title="Show in folder"
                            >
                              <Folder className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => window.electronAPI?.openFile(job.outputPath)}
                              className={`p-1 rounded transition-colors ${
                                isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                              }`}
                              title="Open file"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {job.status === 'pending' && (
                          <button
                            onClick={() => removeFromQueue(job.id)}
                            className={`p-1 rounded transition-colors ${
                              isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                            }`}
                            title="Remove from queue"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card className={`w-full max-w-lg border backdrop-blur ${
            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={`text-xl font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-800'
                }`}>
                  <Clock className="w-5 h-5 text-purple-500" />
                  Recent Files
                </CardTitle>
                {recentFiles.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-500'}
                    onClick={clearRecent}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Your recently processed files
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {recentFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent files yet</p>
                  <p className="text-sm">Process some files to see them here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {recentFiles.map((file, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        file.type === 'merge' ? 'bg-blue-500/20' :
                        file.type === 'extract' ? 'bg-green-500/20' :
                        file.type === 'download' ? 'bg-purple-500/20' : 'bg-orange-500/20'
                      }`}>
                        {file.type === 'merge' ? <Merge className="w-4 h-4 text-blue-400" /> :
                         file.type === 'extract' ? <FileAudio className="w-4 h-4 text-green-400" /> :
                         file.type === 'download' ? <Download className="w-4 h-4 text-purple-400" /> :
                         <VolumeX className="w-4 h-4 text-orange-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{getFileName(file.path)}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(file.date).toLocaleDateString()} - {
                            file.type === 'merge' ? 'Merged' :
                            file.type === 'extract' ? 'Extracted' :
                            file.type === 'download' ? 'Downloaded' : 'Audio Removed'
                          }
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => window.electronAPI?.showInFolder(file.path)}
                          className={`p-1.5 rounded transition-colors ${
                            isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                          }`}
                          title="Show in folder"
                        >
                          <Folder className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.electronAPI?.openFile(file.path)}
                          className={`p-1.5 rounded transition-colors ${
                            isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                          }`}
                          title="Open file"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-center gap-3 py-2 text-xs border-t ${
        isDark ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200'
      }`}>
        <span>Powered by FFmpeg & yt-dlp</span>
        <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>•</span>
        <a 
          href="https://github.com/cristianocps" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`flex items-center gap-1 transition-colors ${
            isDark ? 'hover:text-white' : 'hover:text-slate-700'
          }`}
        >
          <Github className="w-3 h-3" />
          cristianocps
        </a>
      </div>
    </div>
  );
}

export default App;
