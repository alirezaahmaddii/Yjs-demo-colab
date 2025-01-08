import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import 'quill/dist/quill.snow.css';

Quill.register('modules/cursors', QuillCursors);

const App = () => {
    const editorRef = useRef(null);
    const cursorContainerRef = useRef(null);
    const ydocRef = useRef(new Y.Doc());
    const [dataList, setDataList] = useState([]);

    useEffect(() => {
        if (editorRef.current && cursorContainerRef.current) {
            // Initialize Quill
            const quill = new Quill(editorRef.current, {
                modules: {
                    cursors: true,
                    toolbar: [
                        [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        ['image', 'code-block']
                    ],
                    history: {
                        userOnly: true
                    }
                },
                placeholder: 'Start collaborating...',
                theme: 'snow'
            });

            // Initialize Yjs
            const ydoc = ydocRef.current;
            const persistence = new IndexeddbPersistence('quill-demo-db', ydoc);
            const provider = new WebrtcProvider('quill-demo-room', ydoc);
            const ytext = ydoc.getText('quill');

            persistence.on('synced', (isSynced) => {
                if (isSynced) {
                    console.log('Data successfully synced with IndexedDB!');
                } else {
                    console.log('Sync in progress or not yet synced.');
                }
            });

            // Bind Yjs to Quill
            const binding = new QuillBinding(ytext, quill, provider.awareness);

            const awareness = provider.awareness;

            // Assign a random color and name to each user
            const userColor = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random hex color
            const userName = `User-${Math.floor(Math.random() * 1000)}`; // Random username

            // Set initial state for the user
            awareness.setLocalStateField('user', {
                name: userName,
                color: userColor,
                position: { x: 0, y: 0 } // Initial cursor position
            });

            // Update cursor position on mousemove
            const handleMouseMove = (event) => {
                awareness.setLocalStateField('user', {
                    ...awareness.getLocalState()?.user,
                    position: { x: event.clientX, y: event.clientY }
                });
            };

            const handleMouseLeave = () => {
                awareness.setLocalStateField('user', {
                    ...awareness.getLocalState()?.user,
                    position: null
                });
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseleave', handleMouseLeave);

            const renderCursors = () => {
                const states = Array.from(awareness.getStates().entries());
                const localState = awareness.getLocalState();
                const container = cursorContainerRef.current;

                container.innerHTML = '';

                states.forEach(([clientId, state]) => {
                    if (state.user && localState?.user?.name === state.user.name) return;

                    if (state.user && state.user.position) {
                        const cursorElement = document.createElement('div');
                        cursorElement.style.position = 'absolute';
                        cursorElement.style.left = `${state.user.position.x}px`;
                        cursorElement.style.top = `${state.user.position.y}px`;
                        cursorElement.style.width = '10px';
                        cursorElement.style.height = '10px';
                        cursorElement.style.backgroundColor = state.user.color;
                        cursorElement.style.borderRadius = '50%';
                        cursorElement.style.pointerEvents = 'none';

                        // Create username element for cursor
                        const usernameElement = document.createElement('span');
                        usernameElement.textContent = state.user.name;
                        usernameElement.style.position = 'absolute';
                        usernameElement.style.left = '15px';
                        usernameElement.style.top = '-5px'
                        usernameElement.style.fontSize = '12px';
                        usernameElement.style.color = state.user.color;

                        cursorElement.appendChild(usernameElement);
                        container.appendChild(cursorElement);
                    }
                });
            };
            awareness.on('change', renderCursors);

            const yArray = ydoc.getArray('dataList');

            const updateDataList = () => {
                setDataList([...yArray.toArray()]);
            };
            yArray.observe(updateDataList);

            return () => {
                provider.destroy();
                binding.destroy();
                quill.off('text-change');
                awareness.off('change', renderCursors);
                yArray.unobserve(updateDataList);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseleave', handleMouseLeave);
            };
        }
    }, []);
    const ydoc = ydocRef.current;
    const addNewData = () => {
        const yArray = ydoc.getArray('dataList');
        const newItem = {
            name: `Name-${dataList.length + 1}`,
            family: `Family-${dataList.length + 1}`
        };
        yArray.push([newItem]);
    };

    const deleteData = (index) => {
        const yArray = ydoc.getArray('dataList');
        yArray.delete(index);
    };

    return (
        <div>
            {/* Cursor container for real-time collaboration */}
            <div
                ref={cursorContainerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 9999
                }}
            />
            {/* Editor container */}
            <div ref={editorRef} id="editor" style={{ height: '400px', position: 'relative', marginBottom: '20px' }} />

            {/* Button to add new data */}
            <button onClick={addNewData} style={{ margin: '20px', padding: '10px' }}>
                Add New Data
            </button>

            {/* Render data list */}
            <ul>
                {dataList.map((item, index) => (
                    <li key={index}>
                        <button onClick={() => deleteData(index)} >
                        {item.name} {item.family}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default App;
