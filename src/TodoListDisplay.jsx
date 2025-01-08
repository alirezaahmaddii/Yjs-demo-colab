// // TodoListDisplay.jsx
// import { usePowerSync } from "@powersync/react";
// import React from 'react';
//
// export const TodoListDisplay = ({ mamadData }) => {
//     const powersync = usePowerSync();
//
//     const [lists, setLists] = React.useState([]);
//
//     React.useEffect(() => {
//         powersync.getAll('SELECT * from api_layer').then((data) => {
//             // console.log(data.rows.length);
//             setLists(data);
//         })
//     }, [mamadData]);
//
//     return <ul>
//         {lists.map(list => <li key={list.id}>{list.owner_id}  {list.title}</li>)}
//     </ul>
// }

// TodoListDisplay.jsx
import {usePowerSync} from "@powersync/react";
import React from 'react';

export const TodoListDisplay = ({mamadData}) => {
    const powersync = usePowerSync();

    const [lists, setLists] = React.useState([]);

    React.useEffect(() => {
        powersync.getAll('SELECT * from api_layer').then((data) => {
            setLists(data);
        })
    }, [mamadData]);

    const editItem = async (event) => {
        console.log(event.target.attributes.id.value)
        console.log("Edit")
    }

    const deleteItem = async (event) => {
        console.log("Deleting item:", event.target.attributes.id.value)
        await powersync.execute('DELETE FROM api_layer WHERE id=?', [event.target.attributes.id.value]);
    }

    return (
        <table>
            <thead>
            <tr>
                <th>Title</th>
                <th>Edit</th>
            </tr>
            </thead>
            <tbody>
            {lists.map(list => (
                <tr key={list.id} style={{padding: '10px'}}>
                    <td style={{textAlign: "left"}}>{list.title}</td>
                    <td>
                        <input type={"hidden"} value={list.id}/>
                        <label>New title: <input type='text' value={list.title}/></label>
                        <input type='button' value='Edit' onClick={editItem} id={list.id}/>
                        <input type='button' value='Delete' onClick={deleteItem} id={list.id}/>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    );
}