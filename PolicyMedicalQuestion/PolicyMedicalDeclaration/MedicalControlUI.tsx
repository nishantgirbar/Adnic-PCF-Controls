import * as React from "react";
import { MessageBar, MessageBarType, Spinner, Stack, Text, Toggle } from "@fluentui/react";
import "./style.css";

export interface Member {
    id: string; serialNo: number; relation: string; gender: string; dob: string;
    salary: string; visa: string; category: string; marital: string; comments: string;
}
export interface MemberDocument {
    entityNumber?: string | number; originalFilename?: string; fileName?: string;
    blobUrl?: string; url?: string; comment?: string; comments?: string; remarks?: string;
    createdAt?: string; documentType?: string;
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
    const getDocumentBlob = async (doc: MemberDocument): Promise<Blob | null> => {
        const sourceUrl = doc.blobUrl || doc.url;
        if (!sourceUrl) return null;

        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error(`Unable to load document (${response.status})`);
        return response.blob();
    };
    const viewDocument = async (doc: MemberDocument) => {
        const previewWindow = window.open("", "_blank");
        try {
            const blob = await getDocumentBlob(doc);
            if (!blob) {
                previewWindow?.close();
                return;
            }
            const previewUrl = URL.createObjectURL(blob);
            if (previewWindow) previewWindow.location.href = previewUrl;
            else window.open(previewUrl, "_blank");
            window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
        } catch (e) {
            previewWindow?.close();
            console.error("Failed to preview medical document", e);
        }
    };
    const downloadDocument = async (doc: MemberDocument) => {
        try {
            const blob = await getDocumentBlob(doc);
            if (!blob) return;

            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = doc.originalFilename || doc.fileName || "medical-document";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        } catch (e) {
            console.error("Failed to download medical document", e);
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
                                const memberDocuments = documents.filter(d =>
                                    String(d.documentType || "").trim().toUpperCase() === "MEDICAL_DECLARATION" &&
                                    Number(d.entityNumber) === Number(m.id));
                                const documentRemarks = memberDocuments
                                    .map(doc => String(doc.comment || "").trim())
                                    .find(comment => comment.length > 0);
                                return <div className="member-section" key={m.id}>
                                <div className="row grid member-block">
                                    <div>{m.serialNo}</div><div>{m.relation}</div><div>{m.gender}</div><div>{m.dob}</div>
                                    <div>{m.salary}</div><div>{m.visa}</div><div>{m.category}</div><div>{m.marital}</div>
                                </div>
                                {!!(documentRemarks || m.comments) &&
                                    <div className="member-comment">Remarks: {documentRemarks || m.comments}</div>}
                                {memberDocuments.length > 0 && <div className="uploaded-files">
                                    {memberDocuments.map((doc, i) => <div className="uploaded-file-card" key={`${m.id}-${i}`}>
                                        <div className="uploaded-file-left">
                                            <span className="file-check" aria-hidden="true">✓</span>
                                            <div>
                                                <div className="uploaded-file-name">
                                                    {doc.originalFilename || doc.fileName || "Document"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="uploaded-file-actions">
                                            <button type="button" className="file-view-btn"
                                                onClick={() => void viewDocument(doc)}>
                                                <span className="file-action-icon" aria-hidden="true">
                                                    <svg viewBox="0 0 16 16" focusable="false">
                                                        <path d="M8 3c3.3 0 5.8 2.8 6.7 4.1a1.5 1.5 0 0 1 0 1.8C13.8 10.2 11.3 13 8 13s-5.8-2.8-6.7-4.1a1.5 1.5 0 0 1 0-1.8C2.2 5.8 4.7 3 8 3Zm0 1C5.2 4 3 6.5 2.1 7.7a.5.5 0 0 0 0 .6C3 9.5 5.2 12 8 12s5-2.5 5.9-3.7a.5.5 0 0 0 0-.6C13 6.5 10.8 4 8 4Zm0 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                                                    </svg>
                                                </span>
                                                <span>View</span>
                                            </button>
                                            <button type="button" className="file-download-btn"
                                                onClick={() => void downloadDocument(doc)}>
                                                <span className="file-action-icon" aria-hidden="true">
                                                    <svg viewBox="0 0 16 16" focusable="false">
                                                        <path d="M7.5 1a.5.5 0 0 1 1 0v8.3l2.15-2.15a.5.5 0 0 1 .7.7l-3 3a.5.5 0 0 1-.7 0l-3-3a.5.5 0 1 1 .7-.7L7.5 9.3V1ZM2 12.5a.5.5 0 0 1 .5.5v1h11v-1a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V13a.5.5 0 0 1 .5-.5Z" />
                                                    </svg>
                                                </span>
                                                <span>Download</span>
                                            </button>
                                        </div>
                                    </div>)}
                                </div>}
                                </div>;
                            })}
                        </div>
                    )}
                </Stack>
            )}
        </div>
    );
};
export default MedicalControlUI;
