import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { 
  Video, Music, Merge, FolderOpen, Check, AlertCircle, Minus, X,
  Scissors, FileAudio, RefreshCw, Clock, Trash2, Volume2, VolumeX,
  AlertTriangle, Info
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('merge');
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

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMergeProgress((percent) => {
        setProgress(Math.round(percent));
      });
    }
    // Load recent files from localStorage
    const saved = localStorage.getItem('recentFiles');
    if (saved) {
      setRecentFiles(JSON.parse(saved));
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
      } else {
        setStatus('error');
        setMessage(result.message || 'Merge failed');
      }
    } catch (err) {
      setStatus('error');
      const errorMsg = typeof err === 'object' 
        ? (err.message || JSON.stringify(err)) 
        : String(err);
      setMessage(errorMsg || 'An error occurred during merge');
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
      } else {
        setStatus('error');
        setMessage(result.message || 'Extraction failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'An error occurred');
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
      } else {
        setStatus('error');
        setMessage(result.message || 'Remove audio failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'An error occurred');
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
        color: 'text-green-400',
        bgColor: 'bg-green-900/30',
        borderColor: 'border-green-700'
      };
    } else if (diffPercent < 5) {
      return { 
        status: 'close', 
        message: `Durations are close (${formatDuration(diff)} difference)`,
        icon: Info,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/30',
        borderColor: 'border-blue-700'
      };
    } else if (audioDuration > videoDuration) {
      return { 
        status: 'audio-longer', 
        message: `Audio is ${formatDuration(diff)} longer than video. Audio will be trimmed.`,
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-700'
      };
    } else {
      return { 
        status: 'video-longer', 
        message: `Video is ${formatDuration(diff)} longer than audio. Video may have silence at the end.`,
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-700'
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

  const tabs = [
    { id: 'merge', label: 'Merge', icon: Merge },
    { id: 'extract', label: 'Extract Audio', icon: FileAudio },
    { id: 'remove', label: 'Remove Audio', icon: VolumeX },
    { id: 'history', label: 'History', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Custom Title Bar */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <Video className="w-4 h-4 text-blue-400" />
          Video Tools
        </div>
        <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-900/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setStatus('idle'); setMessage(''); setActiveTab(tab.id); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Merge Tab */}
        {activeTab === 'merge' && (
          <Card className="w-full max-w-lg bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Merge className="w-5 h-5 text-blue-400" />
                Merge Audio & Video
              </CardTitle>
              <CardDescription className="text-slate-400">
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
                  className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white border-dashed"
                  onClick={selectVideo}
                  disabled={status === 'processing'}
                >
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                  {videoPath ? getFileName(videoPath) : 'Select or drop video file'}
                </Button>
                {videoInfo && (
                  <div className="flex gap-4 text-xs text-slate-400 pl-2">
                    <span>Duration: {formatDuration(videoInfo.duration)}</span>
                    <span className={videoInfo.hasAudio ? 'text-yellow-400' : 'text-green-400'}>
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
                  className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white border-dashed"
                  onClick={selectAudio}
                  disabled={status === 'processing'}
                >
                  <Music className="w-4 h-4 mr-2 text-green-400" />
                  {audioPath ? getFileName(audioPath) : 'Select or drop audio file'}
                </Button>
                {audioInfo && (
                  <div className="flex gap-4 text-xs text-slate-400 pl-2">
                    <span>Duration: {formatDuration(audioInfo.duration)}</span>
                    {audioInfo.codec && (
                      <span className="text-slate-500">Codec: {audioInfo.codec.toUpperCase()}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Duration Comparison */}
              {durationComparison && (
                <div className={`flex items-center gap-2 p-3 ${durationComparison.bgColor} border ${durationComparison.borderColor} rounded-lg`}>
                  <durationComparison.icon className={`w-5 h-5 ${durationComparison.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className={`text-sm ${durationComparison.color}`}>{durationComparison.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Video: {formatDuration(videoInfo?.duration)} | Audio: {formatDuration(audioInfo?.duration)}
                    </p>
                  </div>
                </div>
              )}

              {/* Output Selection */}
              <Button 
                variant="outline" 
                className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white"
                onClick={selectOutput}
                disabled={status === 'processing'}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                {outputPath ? getFileName(outputPath) : 'Select output location'}
              </Button>

              {/* Progress Bar */}
              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2 bg-slate-700" />
                  <p className="text-sm text-center text-slate-400">
                    Processing... {progress}%
                  </p>
                </div>
              )}

              {/* Status Messages */}
              {status === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                  <p className="text-sm text-green-400">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{message}</p>
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
                  <>
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={mergeFiles}
                      disabled={!videoPath || !audioPath || !outputPath || status === 'processing'}
                    >
                      <Merge className="w-4 h-4 mr-2" />
                      Merge Files
                    </Button>
                    {(videoPath || audioPath || outputPath) && status !== 'processing' && (
                      <Button 
                        variant="outline"
                        className="border-slate-600 hover:bg-slate-700 text-white"
                        onClick={reset}
                      >
                        Reset
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extract Audio Tab */}
        {activeTab === 'extract' && (
          <Card className="w-full max-w-lg bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <FileAudio className="w-5 h-5 text-green-400" />
                Extract Audio
              </CardTitle>
              <CardDescription className="text-slate-400">
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
                  className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white border-dashed"
                  onClick={selectExtractVideo}
                  disabled={status === 'processing'}
                >
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                  {extractVideoPath ? getFileName(extractVideoPath) : 'Select or drop video file'}
                </Button>
              </div>

              <Button 
                variant="outline" 
                className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white"
                onClick={selectExtractOutput}
                disabled={status === 'processing'}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                {extractOutputPath ? getFileName(extractOutputPath) : 'Select output location (.mp3)'}
              </Button>

              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2 bg-slate-700" />
                  <p className="text-sm text-center text-slate-400">Extracting... {progress}%</p>
                </div>
              )}

              {status === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                  <p className="text-sm text-green-400">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{message}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {status === 'success' ? (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Extract Another
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={extractAudio}
                    disabled={!extractVideoPath || !extractOutputPath || status === 'processing'}
                  >
                    <FileAudio className="w-4 h-4 mr-2" />
                    Extract Audio
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Remove Audio Tab */}
        {activeTab === 'remove' && (
          <Card className="w-full max-w-lg bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <VolumeX className="w-5 h-5 text-red-400" />
                Remove Audio
              </CardTitle>
              <CardDescription className="text-slate-400">
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
                  className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white border-dashed"
                  onClick={selectRemoveAudioVideo}
                  disabled={status === 'processing'}
                >
                  <Video className="w-4 h-4 mr-2 text-blue-400" />
                  {removeAudioVideoPath ? getFileName(removeAudioVideoPath) : 'Select or drop video file'}
                </Button>
              </div>

              <Button 
                variant="outline" 
                className="w-full justify-start bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white"
                onClick={selectRemoveAudioOutput}
                disabled={status === 'processing'}
              >
                <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
                {removeAudioOutputPath ? getFileName(removeAudioOutputPath) : 'Select output location'}
              </Button>

              {status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2 bg-slate-700" />
                  <p className="text-sm text-center text-slate-400">Processing... {progress}%</p>
                </div>
              )}

              {status === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                  <p className="text-sm text-green-400">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{message}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {status === 'success' ? (
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Another
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={removeAudio}
                    disabled={!removeAudioVideoPath || !removeAudioOutputPath || status === 'processing'}
                  >
                    <VolumeX className="w-4 h-4 mr-2" />
                    Remove Audio
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card className="w-full max-w-lg bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Recent Files
                </CardTitle>
                {recentFiles.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-slate-400 hover:text-red-400"
                    onClick={clearRecent}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardDescription className="text-slate-400">
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
                      className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50"
                    >
                      <div className={`p-2 rounded-lg ${
                        file.type === 'merge' ? 'bg-blue-500/20' :
                        file.type === 'extract' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {file.type === 'merge' ? <Merge className="w-4 h-4 text-blue-400" /> :
                         file.type === 'extract' ? <FileAudio className="w-4 h-4 text-green-400" /> :
                         <VolumeX className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{getFileName(file.path)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(file.date).toLocaleDateString()} - {
                            file.type === 'merge' ? 'Merged' :
                            file.type === 'extract' ? 'Extracted' : 'Audio Removed'
                          }
                        </p>
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
      <div className="text-center py-2 text-xs text-slate-600 border-t border-slate-800">
        Powered by FFmpeg
      </div>
    </div>
  );
}

export default App;
