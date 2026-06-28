import * as React from "react";

export const MemberPanel = ({ member }: any) => {

    const [loading, setLoading] = React.useState(0);

    return (
        <div className="panel">

            <h3>{member.relation}</h3>
            <div>Premium: {member.premium}</div>

            <input
                type="number"
                value={loading}
                onChange={(e) => setLoading(Number(e.target.value))}
            />

            <button>Apply</button>

            <h4>Documents</h4>

            {member.documents?.map((d: any, i: number) => (
                <div key={i}>
                    {d.name}
                    <button onClick={() => window.open(d.url)}>View</button>
                </div>
            ))}

        </div>
    );
};