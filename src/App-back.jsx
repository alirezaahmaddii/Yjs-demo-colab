import './App.css';
import {PowerSyncDatabase} from '@powersync/web';
import {PowerSyncContext} from "@powersync/react";
import {column, Schema, TableV2} from '@powersync/web';
import React, {useEffect, useState} from 'react';
import {TodoListDisplay} from './TodoListDisplay';
import {StatusDisplay} from './Status';
import {v4 as uuidv4} from 'uuid';
import Logger from 'js-logger';


const BackendConnector = () => {
    // const powersyncUrl = 'http://37.27.26.190:8200/';
    const powersyncUrl = 'http://localhost:8006/';

    return {
        fetchCredentials: async () => {
            console.log("Getting Token...");

            // const url = "http://37.27.26.190:8100/api/token/"
            const url = "http://localhost:8000/api/token/"
            const cred = {
                // "email": "rmm.dev.backend@gmail.com",
                "email": "reza@gmail.com",
                // "password": "123"
                "password": "Aa123456!"
            }

            try {
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cred)
                });

                const data = await resp.json();
                const retrieved_token = data["access_token"];

                if (!retrieved_token) {
                    throw new Error("Token retrieval failed");
                }

                console.log("retrieved_token", retrieved_token);

                return {
                    endpoint: powersyncUrl,
                    token: retrieved_token,
                };
            } catch (error) {
                console.error("Error fetching token:", error);
                return null;
            }
        },

        uploadData: async (database) => {
            console.log("Here uploadData")
            const transaction = await database.getNextCrudTransaction();
            if (!transaction) {
                return;
            }


            for (let tr of transaction.crud) {
                console.log(tr);
                if (tr.op === "PUT") {
                    const addBoardUrl = "http://127.0.0.1:8000/api/layers/"
                    try {
                        // TODO: Upload here
                        const payload = {
                            "parent": tr.opData.parent_id,
                            "layer_type": tr.opData.layer_type,
                            "block_type": tr.opData.block_type,
                            "title": JSON.parse(tr.opData.title),
                        }

                        const resp = await fetch(addBoardUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Basic cmV6YUBnbWFpbC5jb206QWExMjM0NTYh'
                            },
                            body: JSON.stringify(payload)
                        });

                        const data = await resp.json();
                        console.log("New data added --- ", data)

                        await transaction.complete();
                    } catch (error) {
                        if (shouldDiscardDataOnError(error)) {
                            console.error(`Data upload error - discarding`, error);
                            await transaction.complete();
                        } else {
                            throw error;
                        }
                    }
                } else if (tr.op === "DELETE") {
                    try {
                        const layer_id = tr.id;
                        const delete_url = `http://127.0.0.1:8000/api/layers/${layer_id}/`;
                        await fetch(delete_url, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Basic cmV6YUBnbWFpbC5jb206QWExMjM0NTYh'
                            }
                        })
                        await transaction.complete();
                    } catch (error) {
                        console.log(error)
                    }

                }
            }


        }
    };
};


function shouldDiscardDataOnError(error) {
    // TODO: Ignore non-retryable errors here
    return false;
}

function App() {
    const [powersync, setPowerSync] = useState(undefined);
    const [mamadData, setMamadData] = useState([]);
    const [title, setTitle] = useState("Board");
    const [rootId, setRootId] = useState('');

    useEffect(() => {
        console.log("profile")
        // const username = "rmm.dev.backend@gmail.com";
        // const password = "123";

        const username = "reza@gmail.com";
        const password = "Aa123456!";
        const credentials = btoa(`${username}:${password}`);

        // fetch('http://37.27.26.190:8100/api/users/profile/', {
        fetch('http://localhost:8000/api/users/profile/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`
            }
        }).then(response => response.json())
            .then((response) => {
                setRootId(response.root.id);

            })
            .catch(err => {
                console.error(err);
                console.log("error profile")
            });

    }, []);


    const handleChange = (event) => {
        const inpTitle = event.target.value;
        setTitle(inpTitle);
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        const id = uuidv4();
        const title_dict = [
            {
                "text": title,
                "type": "text",
                "styles": {}
            },
        ];

        const title_str = JSON.stringify(title_dict);
        const date_str = new Date().toISOString();
        const parent_id = rootId;

        const query = "INSERT INTO api_layer (id, created_at, title, parent_id, owner_id, layer_type, board_id, block_type, status) values (" +
            '\'' + id + '\'' + ',' +
            '\'' + date_str + '\'' + ',' +
            '\'' + title_str + '\'' + ',' +
            '\'' + parent_id + '\'' + ',' +
            '\'' + "bcbab5c3-8bed-47ea-9bbf-4d3dba71ffc3" + '\'' + ',' +
            '\'' + "BOARD" + '\'' + ',' +
            '\'' + id + '\'' + ',' +
            '\'' + "NOTHING" + '\'' + ',' +
            '\'' + "NO_STATUS" + '\'' + ")";

        console.log(query);

        powersync.execute(query).then((data) => {
            console.log("Data added", data);
        }).catch((e) => {
            console.log("Error", e);
        });
    }


    React.useEffect(async () => {

        const api_layer = new TableV2({
            id: column.text,
            created_at: column.text,
            title: column.text,
            parent_id: column.text,
            owner_id: column.text,
            layer_type: column.text,
            board_id: column.text,
            block_type: column.text,
            status: column.text,
        });

        const AppSchema = new Schema({
            api_layer,
        });
        console.log("Here!!!!!")
        // Setup PowerSync client

        try {
            const db = new PowerSyncDatabase({
                // The schema you defined in the previous step
                schema: AppSchema,
                database: {
                    // Filename for the SQLite database — it's important to only instantiate one instance per file.
                    dbFilename: 'db1.db',
                    debugMode: true,
                    // Optional. Directory where the database file is located.'
                    // dbLocation: 'path/to/directory'
                }
            });

            setPowerSync(db);

            let connector = BackendConnector();

            await db.connect(connector);
            if (db.connected) {
                console.log('Successfully connected to PowerSync');
                db.execute("select * from api_layer").then((data) => {
                    console.log('len data', data.rows.length);
                })

                db.onChange({
                    onChange: (event) => {
                        console.log('Change detected:', event);
                        db.execute("select * from api_layer").then((data) => {
                            console.log('data');
                            console.log(data);
                            setMamadData(data)
                        })
                    }
                }, {tables: ['api_layer']});
            } else {
                console.error('Failed to connect to PowerSync');
            }

        } catch (error) {
            console.error('Failed to connect to PowerSync:', error);
        }
        // db.connect(connector)
        //     .then(() => {
        //
        //         // You can perform any actions that depend on a successful connection here
        //     })
        //     .catch((error) => {
        //
        //         // Handle the error appropriately. You might want to:
        //         // - Display an error message to the user
        //         // - Try to reconnect
        //         // - Set some error state in your component
        //     });


    }, []);
    // const powerSync = React.useMemo(() => {
    //     console.log("Here!!!!!")
    //     // Setup PowerSync client
    //     const db = new PowerSyncDatabase({
    //         // The schema you defined in the previous step
    //         schema: AppSchema,
    //         database: {
    //             // Filename for the SQLite database — it's important to only instantiate one instance per file.
    //             dbFilename: 'powersync10.db',
    //             debugMode: true,
    //             // Optional. Directory where the database file is located.'
    //             // dbLocation: 'path/to/directory'
    //         }
    //     });
    //
    //     let connector = BackendConnector();
    //     db.connect(connector)
    //         .then(() => {
    //             console.log('Successfully connected to PowerSync');
    //             // You can perform any actions that depend on a successful connection here
    //         })
    //         .catch((error) => {
    //             console.error('Failed to connect to PowerSync:', error);
    //             // Handle the error appropriately. You might want to:
    //             // - Display an error message to the user
    //             // - Try to reconnect
    //             // - Set some error state in your component
    //         });
    //
    //     db.execute("select * from api_layer").then((data) => {
    //         console.log('len data', data.rows.length);
    //     })
    //
    //     db.onChange({
    //         onChange: (event) => {
    //             console.log('Change detected:', event);
    //             db.execute("select * from api_layer").then((data) => {
    //                 console.log('data');
    //                 console.log(data);
    //                 setMamadData(data)
    //             })
    //         }
    //     }, {tables: ['api_layer']});
    //
    //     return db;
    // }, [])

    return (
        <>
            {powersync &&
                <PowerSyncContext.Provider value={powersync}>
                    <div className="App">
                        <header className="App-header">
                            <h1>Private</h1>

                            <TodoListDisplay mamadData={mamadData}/>
                            <StatusDisplay></StatusDisplay>
                            <hr/>

                            <form onSubmit={handleSubmit} style={{marginBottom: "100px"}}>
                                <label>Enter title:
                                    <input
                                        type="text"
                                        name="title"
                                        value={title || ""}
                                        onChange={handleChange}
                                    />
                                </label>

                                <input type="submit"/>
                            </form>

                        </header>
                    </div>
                </PowerSyncContext.Provider>
            }
            Private
        </>
    );
}

export default App;
