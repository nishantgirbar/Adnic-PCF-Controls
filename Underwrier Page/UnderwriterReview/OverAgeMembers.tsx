import * as React from "react";
export const OverAgeMembers = ({ data }: any) => (
    <div className="section">
        <h3>Over Aged Members</h3>
        {data?.map((m: any, i: number) => (
            <div key={i}>{m.relation}</div>
        ))}
    </div>
);