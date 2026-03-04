# MG Location: レジリエント戦術マップ & 3Dシチュエーションルーム v1.2

![MG Location Banner](https://img.shields.io/badge/MG--Location-Resilience--v1.1-blueviolet?style=for-the-badge)
![Status Build](https://img.shields.io/badge/Build-Passing-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[English](./README.md) | **日本語** | [Português](./README.pt.md)

**MG Location** は、自然災害（洪水、土砂崩れ、人道危機）シナリオにおける意思決定支援と運用調整のためのシステムです。主な目的は、ネットワークインフラが壊滅的な故障をきたした場合でも、**100%の運用可用性**を保証することです。

---

## 🎯 ミッション
複雑なデータを即時の戦術的行動に変換すること。MG Location は単なるダッシュボードではなく、インターネットが届かない場所でも機能するように設計されたフィールドツールです。

---

## 🏗️ レジリエンス・アーキテクチャ (v1.2)

バージョン 1.2 では、**Resilience-First** 設計の強化と、新たな **戦術的視覚化レイヤー** が導入されました：

```mermaid
graph TD
    subgraph "戦術的UI 2.0"
        UI[PWA Frontend] --> T3D[3Dシチュエーションルーム]
        UI --> SPT[戦術的散布図]
        UI --> MCP[精密地点キャプチャ]
        T3D -.->|共有状態| SPT
    end

    subgraph "現場 / オフライン"
        UI --> DB[(IndexedDB)]
        DB --> OB[アウトボックスキュー]
    end

    subgraph "戦術的プロキシ"
        EH[Edge Hub / RPi] 
        EH -->|ローカル同期| OB
    end

    subgraph "グローバルインフラ"
        API[Django REST API]
        MP[MessagePack + Zstd]
        EV[Event Store / DDD]
        API --> EV
    end

    OB -.->|バイナリ同期| MP
    MP -.-> API
    EH -.->|バックホール| API
```

1. **Local-first (Offline Outbox)**: PWA アプリは IndexedDB を使用してインターネットなしで動作します。アクションは同期待ちキューに入れられ、接続時に自動同期されます。
2. **バイナリプロトコル (MessagePack + Zstd)**: 低帯域幅環境向けにデータトラフィックを最大 80% 削減。
3. **イベントソーシング (DDD)**: 全てのシステム変更を不変のイベントとして扱い、自動的な競合解決を実現。
4. **没入型3D視覚化**: リアルタイムで深い状況認識を可能にする新たな空間レンダリングレイヤー。

---

## 🚀 仕組み

### 1. 3Dシチュエーションルーム (v1.2)
**Three.js** を使用した没入型戦術環境。イベントを脈動する 3D ビーコンとして視覚化し、災害の空間的クラスター化と深度把握を可能にします。

### 2. 戦術分析 (Scatter Plot 2.0)
マップと統合された高度な時系列分析。GDACS、USGS、ローカルイベントを横断して、深刻度の傾向やパターンを特定できます。

### 3. 精密地点キャプチャ
高精度な座標マーキングのための戦術的クロスヘア（照準）システム。現場レポートを即座に視覚分類するためのセマンティックアイコン（Lucide）を統合。

### 4. 捜索救助活動
タスクの割り当て、捜索エリアの境界画定、現場チームの追跡のための戦術モジュール。

---

## 🛠️ テクノロジースタック

- **Frontend**: React 19, Vite, Tailwind CSS, **@react-three/fiber** (3D 環境)。
- **Backend**: Django 5.x, Django REST Framework (堅牢なコア)。
- **Data**: Postgres + Redis (中央) | IndexedDB (ローカル/アプリ)。
- **Protocols**: MessagePack, Zstandard, RESTful Events。
- **SSO/Auth**: Keycloak (エンタープライズレベルの識別。管理)。

---

## 💻 開発の開始

### 前提条件
- Docker & Docker Compose
- Node.js / Bun (ローカル用オプション)
- Python 3.11+ (ローカル用オプション)

### クイックスタート (Docker)
```bash
./dev.sh up
```
- **App**: `http://localhost:8088`
- **API**: `http://localhost:8001`

### データシード (重要)
ブラジル・ミナスジェライス州ウバ（Ubá）の洪水シミュレーションデータを投入するには：
```bash
./dev.sh seed
```

---

## 🤝 貢献のお願い

これは実際の社会的インパクトを持つ **オープンソース** プロジェクトです。さまざまな分野で助けを必要としています：

- **開発者**: 同期アルゴリズムの最適化、新しい AI モジュール。
- **UX スペシャリスト**: ストレス下や高輝度下での使用に適したインターフェースの改善。
- **GIS スペシャリスト**: より多くの地形モデルや衛星レイヤーの統合。
- **データアナリスト**: リスク予測モデルの作成。

### 参加方法
1. [オンボーディングガイド](docs/PROJECT_CONSOLIDATION_MG_LOCATION.md)を読む。
2. [実装ギャップ](docs/DEEP_IMPLEMENTATION_GAP_PLAN.md)を確認する。
3. *Issue* を作成するか、アイデアを *Pull Request* で送信してください。

---

## 📂 プロジェクト構成

```bash
├── apps/               # Django アプリケーション (バックエンド)
├── frontend-react/     # React アプリケーション (フロントエンド)
├── agents/             # AI エージェントと自動化
├── docs/               # 詳細なドキュメントと計画
├── dev.sh              # DX 用の戦術的ツール
└── Dockerfile.*        # 環境定義
```

---

## 📑 詳細ドキュメント
- 📖 [現在のアーキテクチャ](docs/ARCHITECTURE_CURRENT.md)
- ⚖️ [透明性ポリシー](docs/PRIVACY_TRANSPARENCY_POLICY.md)
- 🧪 [テスト計画](docs/SECURITY_TEST_CHECKLIST.md)

---

**MG Location © 2026** - レジリエントなテクノロジーで命を救うために開発されました。
