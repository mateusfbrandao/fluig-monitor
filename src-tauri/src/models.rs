#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub id: i64,
    pub name: String,
    pub release: String,
    pub base_url: String,
    pub kind: String,
    pub log_created_at: Option<String>,
    pub log_update_at: Option<String>,
    pub log_deleted: bool,
    pub log_deleted_at: Option<String>,
    pub is_favorite: bool,
    pub favorited_at: Option<String>,
    pub update_schedule_id: Option<UpdateSchedule>,
    pub o_auth_keys_id: Option<EnvironmentAuthKeys>,
    pub http_responses: Vec<HttpResponse>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSchedule {
    pub id: i64,
    pub scrape_frequency: String,
    pub ping_frequency: String,
    pub environment_id: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentAuthKeys {
    pub id: i64,
    pub payload: String,
    pub hash: String,
    pub environment_id: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponse {
    pub id: i64,
    pub environment_id: i64,
    pub timestamp: String,
    pub endpoint: Option<String>,
    pub resource_type: Option<String>,
    pub status_code: i32,
    pub status_message: Option<String>,
    pub response_time_ms: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateEnvironmentInput {
    pub name: String,
    pub release: String,
    pub base_url: String,
    pub kind: String,
    pub ping_frequency: String,
    pub scrape_frequency: String,
    pub auth_payload: Option<String>,
    pub auth_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEnvironmentInput {
    pub id: i64,
    pub name: String,
    pub release: String,
    pub base_url: String,
    pub kind: String,
    pub ping_frequency: Option<String>,
    pub scrape_frequency: Option<String>,
    pub auth_payload: Option<String>,
    pub auth_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingItem {
    pub setting_id: String,
    pub value: String,
    pub group: Option<String>,
}
