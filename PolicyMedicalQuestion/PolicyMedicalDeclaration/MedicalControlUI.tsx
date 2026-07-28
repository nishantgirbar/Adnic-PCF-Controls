import * as React from "react";
import { MessageBar, MessageBarType, Spinner, Stack, Text, Toggle } from "@fluentui/react";
import "./style.css";

export interface Member {
    id: string; serialNo: number; relation: string; gender: string; dob: string;
    salary: string; visa: string; category: string; marital: string;
}
export interface MemberDocument {
    entityNumber?: string | number; originalFilename?: string; fileName?: string;
    blobUrl?: string; url?: string; comment?: string; createdAt?: string; documentType?: string;
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
                                    d.documentType === "MEDICAL_DECLARATION" &&
                                    Number(d.entityNumber) === Number(m.id));
                                return <React.Fragment key={m.id}>
                                <div className="row grid member-block">
                                    <div>{m.serialNo}</div><div>{m.relation}</div><div>{m.gender}</div><div>{m.dob}</div>
                                    <div>{m.salary}</div><div>{m.visa}</div><div>{m.category}</div><div>{m.marital}</div>
                                </div>
                                {memberDocuments.length > 0 && <div className="uploaded-files">
                                    {memberDocuments.map((doc, i) => <div className="uploaded-file-card" key={`${m.id}-${i}`}>
                                        <div className="uploaded-file-left">
                                            <span className="file-check" aria-hidden="true">✓</span>
                                            <div>
                                                <div className="uploaded-file-name">
                                                    {doc.originalFilename || doc.fileName || "Document"}
                                                </div>
                                                {!!doc.comment && <div className="document-comment">Remarks: {doc.comment}</div>}
                                            </div>
                                        </div>
                                        <div className="uploaded-file-actions">
                                            <button type="button" className="file-view-btn"
                                                onClick={() => void viewDocument(doc)}>View</button>
                                            <button type="button" className="file-download-btn"
                                                onClick={() => void downloadDocument(doc)}>Download</button>
                                        </div>
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
