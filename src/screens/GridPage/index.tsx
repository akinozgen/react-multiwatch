import { useState, useEffect, useCallback, useRef } from "react";
import "./index.scss";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
  }
}

import GridLayout from "react-grid-layout";
import { Button, Transition } from "@headlessui/react";
import toast, { Toaster } from "react-hot-toast";
import { Link as RouterLink } from "react-router-dom";

import {
  Trash2,
  Pencil,
  Check,
  Settings as SettingsIcon,
  ChevronRight,
  X,
  GripVertical,
  Plus,
  Trash,
  MonitorPlay,
  Link,
  ClipboardPaste,
  ClipboardCopy,
  HelpCircle,
} from "lucide-react";

const parseYouTubeId = (input: string): string => {
  try {
    const url = new URL(input.trim());
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      const params = new URLSearchParams(url.search);
      if (params.has("v")) return params.get("v")!;
      const parts = url.pathname.split("/");
      return parts[parts.length - 1];
    }
  } catch {
    // Ignore errors, will check regex below
  }
  const cleaned = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned;
  return "";
};

const shortcuts = [
  { key: "M", description: "Toggle mute for all streams" },
  { key: "Space", description: "Play/pause all streams" },
  { key: "Tab", description: "Navigate between cells" },
  { key: "Shift + Tab", description: "Navigate backward between cells" },
  { key: "Backspace", description: "Clear focused cell" },
  { key: "Delete", description: "Remove focused cell" },
  { key: "E", description: "Enter edit mode" },
  { key: "Shift + E", description: "Exit edit mode" },
  { key: "Shift + R", description: "Reset layout" },
  { key: "Alt + R", description: "Reset everything (layout + streams)" },
  { key: "A", description: "Add new cell (in edit mode)" },
  { key: "Arrow Keys", description: "Move focused cell (in edit mode)" },
  { key: "Shift + Arrow keys", description: "Resize focused cell (in edit mode)" }
];

export default function GridPage() {
  const playersRef = useRef<{ [key: number]: YT.Player }>({});

  const [streams, setStreams] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [layout, setLayout] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [focusedCell, setFocusedCell] = useState<number | null>(null);
  const [isKeyboardGuideOpen, setIsKeyboardGuideOpen] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState<string[]>([]);

  const [toolbarPos, setToolbarPos] = useState({
    x: window.innerWidth / 2 - 100,
    y: 20,
  });
  const [, setIsDraggingToolbar] = useState(false);

  function handleToolbarDrag(e: React.MouseEvent<HTMLDivElement>) {
    const toolbar = e.currentTarget.parentElement as HTMLDivElement;
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = toolbar.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    function onMouseMove(moveEvent: MouseEvent) {
      moveEvent.preventDefault();
      const newX = moveEvent.clientX - offsetX;
      const newY = moveEvent.clientY - offsetY;
      setToolbarPos({ x: newX, y: newY });
    }

    function onMouseUp() {
      setIsDraggingToolbar(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    setIsDraggingToolbar(true);
  }

  const notify = (message: string) => {
    toast(message, {
      duration: 1500,
    });
  };

  const saveProfile = (name: string) => {
    const profiles = JSON.parse(
      localStorage.getItem("multiwatch-profiles") || "{}"
    );
    const settings = { streams, layout };
    const encoded = encodeURIComponent(JSON.stringify(settings));
    const fullUrl = `${window.location.origin}${window.location.pathname}#${encoded}`;

    profiles[name] = { streams, layout, shareUrl: fullUrl };
    localStorage.setItem("multiwatch-profiles", JSON.stringify(profiles));
    notify(`Profile "${name}" saved!`);
  };

  const loadProfile = (name: string) => {
    const profiles = JSON.parse(
      localStorage.getItem("multiwatch-profiles") || "{}"
    );
    if (profiles[name]) {
      setStreams(profiles[name].streams);
      setLayout(profiles[name].layout);
      notify(`Profile "${name}" loaded!`);
    } else {
      notify(`Profile "${name}" not found.`);
    }
  };

  const deleteProfile = (name: string) => {
    const profiles = JSON.parse(
      localStorage.getItem("multiwatch-profiles") || "{}"
    );
    delete profiles[name];
    localStorage.setItem("multiwatch-profiles", JSON.stringify(profiles));
    notify(`Profile "${name}" deleted.`);
  };

  const listProfiles = () => {
    const profiles = JSON.parse(
      localStorage.getItem("multiwatch-profiles") || "{}"
    );
    return Object.keys(profiles);
  };

  const saveSettings = useCallback((streamsList = streams, layoutList = layout) => {
    if (!hasLoaded) return;
    const settings = { streams: streamsList, layout: layoutList };
    window.location.hash = encodeURIComponent(JSON.stringify(settings));
  }, [hasLoaded, layout, streams]);

  const addCell = () => {
    const newStreams = [...streams, ""];
    const nextX = layout.length % 6;
    const nextY = Math.floor(layout.length / 6);
    const newLayout = [
      ...layout,
      { i: String(layout.length), x: nextX, y: nextY, w: 1, h: 1 },
    ];
    setStreams(newStreams);
    setLayout(newLayout);
    saveSettings(newStreams, newLayout);
  };

  const resetAll = () => {
    setStreams([]);
    setLayout([]);
    saveSettings([], []);

    notify("All settings have been reset.");
  };

  const resetLayoutOnly = () => {
    const newLayout = streams.map((_, idx) => ({
      i: String(idx),
      x: idx % 6,
      y: Math.floor(idx / 6),
      w: 1,
      h: 1,
    }));
    setLayout(newLayout);
    saveSettings(streams, newLayout);

    notify("Layout has been reset.");
  };

  const initializePlayer = (videoId: string, index: number) => {
    if (!videoId) return;

    new YT.Player(`player-${index}`, {
      videoId,
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 1,
      },
      events: {
        onReady: (event: YT.PlayerEvent) => {
          playersRef.current[index] = event.target;
        },
      },
    });
  };

  const handleIframeHover = (index: number) => {
    Object.entries(playersRef.current).forEach(([playerIndex, player]) => {
      if (Number(playerIndex) === index) {
        player.unMute();
      } else {
        player.mute();
      }
    });
  };

  const handeWindowBlur = useCallback(() => {
    Object.entries(playersRef.current).forEach(([, player]) => {
      player.mute();
    });
  }, []);

  const handeVisibilityChange = useCallback(() => {
    if (document.hidden) {
      Object.entries(playersRef.current).forEach(([, player]) => {
        player.mute();
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("blur", handeWindowBlur);
    document.addEventListener("visibilitychange", handeVisibilityChange);
    return () => {
      window.removeEventListener("blur", handeWindowBlur);
      document.removeEventListener("visibilitychange", handeVisibilityChange);
    };
  }, [handeWindowBlur, handeVisibilityChange]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const refreshProfiles = useCallback(() => {
    setProfiles(listProfiles());
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const data = JSON.parse(decodeURIComponent(hash));
        if (Array.isArray(data.streams)) setStreams(data.streams);
        if (Array.isArray(data.layout)) setLayout(data.layout);
      } catch {
        console.error("Failed to parse settings from URL hash:", hash);
      }
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    saveSettings(streams, layout);
  }, [streams, layout, hasLoaded, saveSettings]);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      streams.forEach((streamId, idx) => {
        const parsedId = parseYouTubeId(streamId);
        if (parsedId) {
          initializePlayer(parsedId, idx);
        }
      });
    } else {
      window.onYouTubeIframeAPIReady = () => {
        streams.forEach((streamId, idx) => {
          const parsedId = parseYouTubeId(streamId);
          if (parsedId) {
            initializePlayer(parsedId, idx);
          }
        });
      };
    }
  }, [streams]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isKeyboardGuideOpen) {
        setIsKeyboardGuideOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isKeyboardGuideOpen]);

  const rowHeight = viewportSize.height / 6;

  const updateStream = (index: number, rawInput: string) => {
    setStreams((prev) => {
      const copy = [...prev];
      copy[index] = rawInput;
      saveSettings(copy, layout);
      return copy;
    });
  };

  const clearStream = (index: number) => {
    // First destroy the player instance if it exists
    if (playersRef.current[index]) {
      playersRef.current[index].destroy();
      delete playersRef.current[index];
    }
    
    // Then update the stream
    updateStream(index, "");
  };

  const deleteCell = (index: number) => {
    // Clean up player first
    if (playersRef.current[index]) {
      playersRef.current[index].destroy();
      delete playersRef.current[index];
    }

    const newStreams = [...streams];
    const newLayout = [...layout];
    newStreams.splice(index, 1);
    newLayout.splice(index, 1);
    const cleanedLayout = newLayout.map((item, idx) => ({
      ...item,
      i: String(idx),
    }));
    setStreams(newStreams);
    setLayout(cleanedLayout);
    saveSettings(newStreams, cleanedLayout);
  };

  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key.toLowerCase()) {
      case 'm':
        // Toggle mute all
        Object.values(playersRef.current).forEach(player => {
          if (player.isMuted()) {
            player.unMute();
          } else {
            player.mute();
          }
        });
        break;

      case ' ':
        // Space - Play/Pause all
        e.preventDefault();
        Object.values(playersRef.current).forEach(player => {
          const state = player.getPlayerState();
          if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
          } else {
            player.playVideo();
          }
        });
        break;

      case 'tab':
        // Tab navigation
        e.preventDefault();
        if (streams.length === 0) return;
        
        if (e.shiftKey) {
          setFocusedCell(prev => 
            prev === null || prev === 0 ? streams.length - 1 : prev - 1
          );
        } else {
          setFocusedCell(prev => 
            prev === null || prev === streams.length - 1 ? 0 : prev + 1
          );
        }
        break;

      case 'backspace':
        // Clear focused cell
        if (focusedCell !== null) {
          clearStream(focusedCell);
        }
        break;

      case 'delete':
        // Delete focused cell
        if (focusedCell !== null) {
          deleteCell(focusedCell);
          setFocusedCell(null);
        }
        break;

      case 'e':
        if (e.shiftKey) {
          // Shift + E - Exit edit mode
          setIsEditMode(false);
        } else {
          // E - Enter edit mode
          setIsEditMode(true);
        }
        break;

      case 'r':
        if (e.altKey) {
          // Alt + R - Reset everything
          if (window.confirm('Are you sure you want to reset everything?')) {
            resetAll();
          }
        } else if (e.shiftKey) {
          // Shift + R - Reset layout
          if (window.confirm('Are you sure you want to reset the layout?')) {
            resetLayoutOnly();
          }
        }
        break;

      case 'a':
        // A - Add new cell in edit mode
        if (isEditMode) {
          addCell();
        }
        break;
    }

    // Handle arrow keys in edit mode
    if (isEditMode && focusedCell !== null) {
      const currentLayout = layout[focusedCell];
      if (!currentLayout) return;

      if (e.shiftKey) {
        // Resize with Shift + Arrow keys
        switch (e.key) {
          case 'ArrowRight':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, w: Math.min(item.w + 1, 6) } : item
            ));
            break;
          case 'ArrowLeft':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, w: Math.max(item.w - 1, 1) } : item
            ));
            break;
          case 'ArrowDown':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, h: item.h + 1 } : item
            ));
            break;
          case 'ArrowUp':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, h: Math.max(item.h - 1, 1) } : item
            ));
            break;
        }
      } else {
        // Move with Arrow keys
        switch (e.key) {
          case 'ArrowRight':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, x: Math.min(item.x + 1, 5) } : item
            ));
            break;
          case 'ArrowLeft':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, x: Math.max(item.x - 1, 0) } : item
            ));
            break;
          case 'ArrowDown':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, y: item.y + 1 } : item
            ));
            break;
          case 'ArrowUp':
            setLayout(prev => prev.map((item, idx) => 
              idx === focusedCell ? { ...item, y: Math.max(item.y - 1, 0) } : item
            ));
            break;
        }
      }
    }
  }, [focusedCell, isEditMode, streams.length, layout]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [handleKeyboardShortcuts]);

  const KeyboardShortcut = ({ shortcut: { key, description } }: { shortcut: { key: string, description: string } }) => {
    const keys = key.split('+').map(k => k.trim());
    
    return (
      <div className="keybinding-card" role="listitem">
        <div className="keys">
          {keys.map((k, i) => (
            <>
              {i > 0 && <span className="plus">+</span>}
              <kbd>{k}</kbd>
            </>
          ))}
        </div>
        <div className="description">
          {description}
        </div>
      </div>
    );
  };

  const KeyboardGuide = () => (
    <Transition
      show={isKeyboardGuideOpen}
      enter="transition transform duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition transform duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div 
        className="modal-overlay" 
        onClick={() => setIsKeyboardGuideOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-guide-title"
      >
        <div 
          className="keyboard-guide" 
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="close-btn" 
            onClick={() => setIsKeyboardGuideOpen(false)}
            aria-label="Close keyboard shortcuts guide"
          >
            <X size={24} />
          </button>
          <h2 id="keyboard-guide-title">Keyboard Shortcuts</h2>
          <div 
            className="keybindings-grid"
            role="list"
          >
            {shortcuts.map((shortcut) => (
              <KeyboardShortcut key={shortcut.key} shortcut={shortcut} />
            ))}
          </div>
        </div>
      </div>
    </Transition>
  );
  
  return (
    <div className={`grid-page ${isInteracting ? "interacting" : ""}`}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: "",
          duration: 5000,
          removeDelay: 1000,
          style: {
            background: "#363636",
            color: "#fff",
          },

          // Default options for specific types
          success: {
            duration: 3000,
            iconTheme: {
              primary: "green",
              secondary: "black",
            },
          },
        }}
      />
      {isEditMode && (
        <div
          className="edit-toolbar"
          style={{
            position: "absolute",
            left: `${toolbarPos.x}px`,
            top: `${toolbarPos.y}px`,
          }}
        >
          <div className="toolbar-drag-handle" onMouseDown={handleToolbarDrag}>
            <GripVertical size={18} />
          </div>
          <Button
            className="stop-edit-button"
            onClick={() => setIsEditMode(false)}
          >
            <Check size={18} /> Done
          </Button>
          <Button className="add-stream-button" onClick={addCell}>
            <Plus size={18} /> Add Stream
          </Button>
          <Button
            className="add-stream-button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          >
            <SettingsIcon size={18} />
          </Button>
        </div>
      )}
      <div className="controls">
        <Button
          className="settings-button"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        >
          {isDrawerOpen ? (
            <ChevronRight size={18} />
          ) : (
            <SettingsIcon size={18} />
          )}
        </Button>
        <Button
          className="settings-button"
          onClick={() => {
            setIsEditMode(!isEditMode);
            setIsDrawerOpen(false);
          }}
        >
          {isEditMode ? <Check size={18} /> : <Pencil size={18} />}
        </Button>
        <Button
          className="settings-button"
          onClick={() => setIsKeyboardGuideOpen(true)}
        >
          <HelpCircle size={18} />
        </Button>
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        cols={6}
        rowHeight={rowHeight}
        width={viewportSize.width - (isDrawerOpen ? 300 : 0)}
        isResizable={isEditMode}
        isDraggable={isEditMode}
        margin={[0, 0]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={!isEditMode}
        onLayoutChange={(newLayout) => setLayout(newLayout)}
        onDragStart={() => setIsInteracting(true)}
        onDragStop={() => setIsInteracting(false)}
        onResizeStart={() => setIsInteracting(true)}
        onResizeStop={() => setIsInteracting(false)}
        draggableHandle=".drag-handle"
      >
        {streams.map((streamId, idx) => {
          const parsedId = parseYouTubeId(streamId);
          return (
            <div 
              key={idx} 
              className={`grid-item ${focusedCell === idx ? 'focused' : ''}`}
              role="region"
              aria-label={`Stream ${idx + 1}`}
              tabIndex={focusedCell === idx ? 0 : -1}
            >
              {isEditMode && (
                <>
                  <div className="drag-handle">
                    <GripVertical size={18} />
                  </div>
                  <button
                    className="delete-cell-button"
                    onClick={() => deleteCell(idx)}
                  >
                    <Trash size={16} />
                  </button>
                </>
              )}
              <div className={`iframe-wrapper iframe-${idx}`}>
                {parsedId ? (
                  <div
                    onMouseEnter={() => handleIframeHover(idx)}
                    className="iframe-container"
                  >
                    <div 
                    id={`player-${idx}`}
                    className={`stream-iframe ${
                      isInteracting ? "disabled" : ""
                    }`} />
                  </div>
                ) : (
                  <div className="placeholder with-input" >
                    <input
                      type="text"
                      placeholder="YouTube ID or URL"
                      value={streamId}
                      onChange={(e) => updateStream(idx, e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </GridLayout>

      {streams.length === 0 && (
        <Transition
          appear
          show={true}
          enter="transition ease-out duration-300"
          enterFrom="opacity-0 scale-90"
          enterTo="opacity-100 scale-100"
        >
          <div className="empty-state">
            <MonitorPlay size={64} className="empty-icon" />
            <h1>No streams yet</h1>
            <p className="subtitle">
              Start tracking your favorite YouTube streams easily:
            </p>

            <div className="steps">
              <div className="step">
                <div className="step-icon">
                  <Plus size={24} />
                </div>
                <div className="step-text">
                  <h3>Add a Stream Cell</h3>
                  <p>Click the Add button to create a new stream block.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-icon">
                  <ClipboardPaste size={24} />
                </div>
                <div className="step-text">
                  <h3>Paste a Link</h3>
                  <p>Enter any YouTube URL or ID directly into a block.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-icon">
                  <Pencil size={24} />
                </div>
                <div className="step-text">
                  <h3>Organize Freely</h3>
                  <p>
                    Drag, resize, and arrange your streams however you like.
                  </p>
                </div>
              </div>
              <div className="step">
                <div className="step-icon">
                  <Link size={24} />
                </div>
                <div className="step-text">
                  <h3>Share Easily</h3>
                  <p>
                    Use your browser URL to share the whole layout with friends.
                  </p>
                </div>
              </div>
            </div>

            <Button className="add-first-button" onClick={addCell}>
              <Plus size={20} /> Add First Stream
            </Button>
          </div>
        </Transition>
      )}

      <Transition
        show={isDrawerOpen}
        enter="transition transform duration-300"
        enterFrom="translate-x-full"
        enterTo="translate-x-0"
        leave="transition transform duration-200"
        leaveFrom="translate-x-0"
        leaveTo="translate-x-full"
      >
        <div className="drawer">
          <div className="drawer-content">
            <div className="drawer-header">
              <h2>
                <SettingsIcon size={20} /> Settings
              </h2>
              <button
                className="close-button"
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="setting-group">
              <label>Navigation:</label>
              <div className="layout-controls">
                <RouterLink to="/">
                  <a className="home-link">
                    <MonitorPlay size={18} /> Home
                  </a>
                </RouterLink>
              </div>
            </div>

            <div className="setting-group">
              <label>Layout Controls:</label>
              <div className="layout-controls">
                <Button
                  className="edit-button"
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    setIsDrawerOpen(false);
                  }}
                >
                  {isEditMode ? <Check size={18} /> : <Pencil size={18} />}
                  {isEditMode ? " Editing Enabled" : " Enable Edit Mode"}
                </Button>
                <Button className="settings-button" onClick={addCell}>
                  <Plus size={18} /> Add New Stream
                </Button>
              </div>
            </div>

            <div className="setting-group">
              <label>Streams:</label>
              <div className="streams-list">
                {streams.map((streamId, idx) => (
                  <div key={idx} className="stream-input-group">
                    <input
                      type="text"
                      value={streamId}
                      placeholder="YouTube ID or URL"
                      onChange={(e) => updateStream(idx, e.target.value)}
                    />
                    <button onClick={() => clearStream(idx)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label>Profiles:</label>

              <div className="profiles-controls">
                <div className="save-profile">
                  <input
                    type="text"
                    placeholder="Profile Name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (profileName.trim()) {
                        saveProfile(profileName.trim());
                        setProfileName("");
                        refreshProfiles(); // update list after saving
                      }
                    }}
                  >
                    Save
                  </button>
                </div>

                <div className="load-profile">
                  {profiles.length > 0 ? (
                    <ul className="profile-list">
                      {profiles.map((name) => (
                        <li key={name}>
                          <div
                            className="profile-name"
                            onClick={() => loadProfile(name)}
                          >
                            {name}
                          </div>

                          <div className="profile-actions">
                            <button
                              className="profile-share"
                              onClick={(e) => {
                                e.stopPropagation(); // Don't trigger parent click
                                const profiles = JSON.parse(
                                  localStorage.getItem("multiwatch-profiles") ||
                                    "{}"
                                );
                                if (profiles[name]?.shareUrl) {
                                  navigator.clipboard.writeText(
                                    profiles[name].shareUrl
                                  );
                                  notify(`Share link copied!`);
                                } else {
                                  notify(`No share link found.`);
                                }
                              }}
                            >
                              <ClipboardCopy size={16} />
                            </button>

                            <button
                              className="profile-delete"
                              onClick={(e) => {
                                e.stopPropagation(); // Don't trigger parent click
                                deleteProfile(name);
                                refreshProfiles();
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-profiles">No saved profiles.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="setting-group">
              <label>Share this layout:</label>
              <div className="streams-list">
                <div className="stream-input-group">
                  <input type="text" value={window.location.href} readOnly />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      notify("URL copied to clipboard!");
                    }}
                  >
                    <ClipboardPaste size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <Button
                className="reset-button"
                onClick={() => setIsResetModalOpen(true)}
              >
                Reset Layout
              </Button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition
        show={isResetModalOpen}
        enter="transition transform duration-300"
        enterFrom="translate-y-full"
        enterTo="translate-y-0"
        leave="transition transform duration-200"
        leaveFrom="translate-y-0"
        leaveTo="translate-y-full"
      >
        <div className="modal-overlay">
          <div className="modal">
            <h2>Reset Options</h2>
            <p>What do you want to reset?</p>
            <div className="modal-buttons">
              <Button
                className="reset-layout-button"
                onClick={() => {
                  resetLayoutOnly();
                  setIsResetModalOpen(false);
                }}
              >
                Reset Layout Only
              </Button>
              <Button
                className="reset-all-button"
                onClick={() => {
                  resetAll();
                  setIsResetModalOpen(false);
                }}
              >
                Reset Everything
              </Button>
            </div>
            <Button
              className="cancel-button"
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Transition>

      <button 
        className="help-button"
        onClick={() => setIsKeyboardGuideOpen(true)}
        aria-label="Open keyboard shortcuts guide"
        aria-expanded={isKeyboardGuideOpen}
        title="View keyboard shortcuts"
      >
        <HelpCircle size={24} />
      </button>

      <KeyboardGuide />
    </div>
  );
}
