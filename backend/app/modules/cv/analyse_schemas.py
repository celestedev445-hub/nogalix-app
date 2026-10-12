from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.support.uploads import ensure_json_size

# 5 Mo binaire ≈ 6,7 Mo en base64 (+ marge).
MAX_BASE64_CHARS = 7_100_000
# CV JSON (photo en data URL comprise, ~900 Ko max) : 2 Mo.
MAX_CV_JSON_BYTES = 2 * 1024 * 1024


class CvAnalyseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    jobOffer: str = Field(default="", max_length=20000)


class CvUploadAnalyseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    fileName: str = Field(max_length=255)
    contentBase64: str = Field(min_length=1, max_length=MAX_BASE64_CHARS)
    jobOffer: str = Field(default="", max_length=20000)


class CvMatchAnalyseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    jobOffer: str = Field(min_length=40, max_length=12000)
    cvId: Optional[str] = None
    resumeText: Optional[str] = Field(default=None, max_length=20000)
    fileName: Optional[str] = Field(default=None, max_length=255)


class MatchAction(BaseModel):
    title: str
    detail: str


class CvMatchAnalyseResponse(BaseModel):
    matchScore: int
    verdict: Literal["forte", "partielle", "faible"]
    verdictLabel: str
    summary: str
    alignedPoints: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    actions: list[MatchAction] = Field(default_factory=list)
    source: Literal["ai", "local"] = "local"
    cvLabel: str = "CV"
    jobTitle: Optional[str] = None
    cvId: Optional[str] = None


class CvRewriteAnalyseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    jobOffer: str = Field(min_length=40, max_length=12000)
    templateId: str = Field(default="atlas", min_length=2, max_length=64)
    cvId: Optional[str] = None
    resumeText: Optional[str] = Field(default=None, max_length=20000)
    fileName: Optional[str] = Field(default=None, max_length=255)
    jobTitle: Optional[str] = Field(default=None, max_length=120)
    actions: list[MatchAction] = Field(default_factory=list)


class CvRewriteAnalyseResponse(BaseModel):
    payload: dict[str, Any]
    source: Literal["ai", "local"] = "local"


class AnalysisSuggestion(BaseModel):
    id: str
    title: str
    description: str
    impact: Literal["élevé", "moyen", "faible"] = "moyen"


class AnalysisCategory(BaseModel):
    id: str
    label: str
    score: int


class CvAnalyseResponse(BaseModel):
    score: int
    label: str
    summary: str
    suggestions: list[AnalysisSuggestion] = Field(default_factory=list)
    categories: list[AnalysisCategory] = Field(default_factory=list)
    cvId: Optional[str] = None


class CvImportParseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(min_length=20, max_length=40000)
    fileName: Optional[str] = Field(default=None, max_length=255)
    requireAi: bool = False


class CvImportParseResponse(BaseModel):
    payload: dict[str, Any]
    source: Literal["ai", "local"] = "local"


class CvTranslateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    languageCode: str = Field(min_length=2, max_length=16)
    languageName: str = Field(min_length=2, max_length=80)
    cv: dict[str, Any]

    @field_validator("cv")
    @classmethod
    def cv_size(cls, value: dict[str, Any]) -> dict[str, Any]:
        return ensure_json_size(value, MAX_CV_JSON_BYTES, "CV")


class CvTranslateResponse(BaseModel):
    payload: dict[str, Any]
    source: Literal["ai"] = "ai"
    languageName: str = ""
