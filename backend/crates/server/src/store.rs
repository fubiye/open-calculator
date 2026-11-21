use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde_json::Value;
use tokio::sync::RwLock;

/// A workbook revision held in memory.
#[derive(Debug, Clone)]
pub struct Workbook {
    pub id: String,
    pub name: String,
    pub snapshot: Value,
    pub revision: u64,
    pub updated_at: DateTime<Utc>,
}

/// In-memory workbook storage. Data is lost when the process exits.
#[derive(Debug, Default)]
pub struct WorkbookStore {
    workbooks: RwLock<HashMap<String, Workbook>>,
}

impl WorkbookStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns a copy of the workbook, if it exists.
    pub async fn get(&self, id: &str) -> Option<Workbook> {
        self.workbooks.read().await.get(id).cloned()
    }

    /// Inserts or replaces a workbook, bumping its revision (first write is 1).
    pub async fn upsert(&self, id: &str, name: String, snapshot: Value) -> Workbook {
        let mut workbooks = self.workbooks.write().await;
        let revision = workbooks
            .get(id)
            .map_or(1, |workbook| workbook.revision + 1);
        let workbook = Workbook {
            id: id.to_owned(),
            name,
            snapshot,
            revision,
            updated_at: Utc::now(),
        };
        workbooks.insert(id.to_owned(), workbook.clone());

        workbook
    }
}
