import * as React from "react";
import { MessageBar, MessageBarType, Spinner, Stack, Text, Toggle } from "@fluentui/react";
import "./style.css";

export interface Member {
    id: string; serialNo: number; relation: string; gender: string; dob: string;
    salary: string; visa: string; category: string; marital: string;
}
export interface MemberDocument {
    entityNumber?: string | number; originalFilename?: string; fileName?: string;
    blobUrl?: string; url?: string; comment?: string; createdAt?: string;
}
export interface Question {
    id: number; question: string; answer: boolean; category: string;
}
interface Props {
    questions: Question[]; members: Member[]; documents: MemberDocument[]; loading: boolean; error: string;
    onQuestionsChange: (questions: Question[]) => void;
}

const MedicalControlUI: React.FC<Props> = ({ questions, members, documents, loading, error, onQuestionsChange }) => {
    const handleToggle = (id: number, checked?: boolean) =>
        onQuestionsChange(questions.map(q => q.id === id ? { ...q, answer: !!checked } : q));
    const showDeclaredMembers = questions.some(q => q.answer) && members.length > 0;
    const viewDocument = async (doc: MemberDocument) => {
        const sourceUrl = doc.blobUrl || doc.url;
        if (!sourceUrl) return;
        const previewWindow = window.open("", "_blank");
        try {
            const response = await fetch(sourceUrl);
            if (!response.ok) throw new Error(`Unable to load document (${response.status})`);
            const blob = await response.blob();
            const previewUrl = URL.createObjectURL(blob);
            if (previewWindow) previewWindow.location.href = previewUrl;
            else window.open(previewUrl, "_blank");
            window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
        } catch (e) {
            previewWindow?.close();
            console.error("Failed to preview medical document", e);
        }
    };

    return (
        <div className="medical-pcf">
            {loading && <Spinner label="Loading medical details..." />}
            {!!error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
            {!loading && !error && (
                <Stack tokens={{ childrenGap: 15 }}>
                    {questions.map(q => (
                        <div className="question-row" key={q.id}>
                            <div>
                                <Text>{q.question}</Text>
                                {!!q.category && <Text className="question-category">{q.category}</Text>}
                            </div>
                            <Toggle checked={q.answer} onChange={(_e, checked) => handleToggle(q.id, checked)}
                                onText="Yes" offText="No" disabled />
                        </div>
                    ))}
                    {showDeclaredMembers && (
                        <div className="grid-wrapper">
                            <div className="grid-header"><Text variant="mediumPlus">Medical Declared Members</Text></div>
                            <div className="row header grid">
                                <div>Serial</div><div>Relation</div><div>Gender</div><div>DOB</div>
                                <div>Salary</div><div>Visa</div><div>Category</div><div>Marital</div>
                            </div>
                            {members.map(m => {
                                const memberDocuments = documents.filter(d => Number(d.entityNumber) === Number(m.id));
                                return <React.Fragment key={m.id}>
                                <div className="row grid member-block">
                                    <div>{m.serialNo}</div><div>{m.relation}</div><div>{m.gender}</div><div>{m.dob}</div>
                                    <div>{m.salary}</div><div>{m.visa}</div><div>{m.category}</div><div>{m.marital}</div>
                                </div>
                                {memberDocuments.length > 0 && <div className="member-documents">
                                    {memberDocuments.map((doc, i) => <div className="member-document" key={`${m.id}-${i}`}>
                                        <span>{doc.originalFilename || doc.fileName || "Document"}</span>
                                        {!!doc.comment && <span className="document-comment">Remarks: {doc.comment}</span>}
                                        <button type="button" onClick={() => void viewDocument(doc)}>View</button>
                                    </div>)}
                                </div>}
                                </React.Fragment>;
                            })}
                        </div>
                    )}
                </Stack>
            )}
        </div>
    );
};
export default MedicalControlUI;
