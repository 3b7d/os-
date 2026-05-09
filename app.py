import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from sqlalchemy import create_engine

# 1. Page Configuration
st.set_page_config(
    page_title="abdullah prompt",
    page_icon="🚚",
    layout="wide"
)

# Arabic Styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
    html, body, [class*="css"]  {
        font-family: 'Tajawal', sans-serif;
        direction: rtl;
        text-align: right;
    }
    .main {
        background-color: #f8fafc;
    }
    div[data-testid="stMetricValue"] {
        font-size: 24px;
        font-weight: 700;
    }
</style>
""", unsafe_allow_html=True)

# 2. Sidebar Controls
st.sidebar.title("abdullah prompt")
st.sidebar.divider()

data_source = st.sidebar.radio(
    "اختر مصدر البيانات:",
    ("الربط المباشر (MySQL)", "رفع ملف إكسل")
)

@st.cache_data
def load_mysql_data():
    # Simulated MySQL connection
    # engine = create_engine('mysql+pymysql://user:pass@host/db')
    # df = pd.read_sql("SELECT * FROM delivery_tasks", engine)
    
    # Mock data for demonstration
    data = {
        'Creation_DateTime': pd.to_datetime(['2024-05-01 10:00', '2024-05-01 11:30', '2024-05-02 09:00', '2024-05-03 14:00', '2024-05-04 11:00']),
        'Task_Status': ['Successful', 'Successful', 'Accepted', 'Successful', 'Failed'],
        'Agent_Name': ['أحمد محمد', 'خالد العتيبي', 'ياسر القحطاني', 'أحمد محمد', 'فهد سليمان'],
        'Team_Name': ['مستودع الرياض', 'مستودع الرياض', 'مستودع جدة', 'مستودع الرياض', 'مستودع جدة'],
        'Distance(KM)': [12.5, 8.2, 22.1, 10.0, 7.5],
        'Total_Time_Taken(min)': [45, 30, 0, 35, 0],
        'عدد_الطبالي': [3, 1, 5, 3, 2],
        'Customer_Address': ['الرياض، حي النرجس', 'الرياض، حي الملقا', 'جدة، حي الشاطئ', 'الرياض، حي الشفا', 'جدة، الحمراء']
    }
    return pd.DataFrame(data)

df = pd.DataFrame()

if data_source == "الربط المباشر (MySQL)":
    df = load_mysql_data()
    st.sidebar.success("تم الاتصال بقاعدة البيانات بنجاح")
else:
    uploaded_file = st.sidebar.file_uploader("قم برفع ملف إكسل (.xlsx)", type=['xlsx'])
    if uploaded_file:
        df = pd.read_excel(uploaded_file)
        st.sidebar.success("تم رفع الملف بنجاح")

if not df.empty:
    # Data Processing
    df['Creation_DateTime'] = pd.to_datetime(df['Creation_DateTime'])
    df['Distance(KM)'] = pd.to_numeric(df['Distance(KM)'], errors='coerce').fillna(0)
    df['Total_Time_Taken(min)'] = pd.to_numeric(df['Total_Time_Taken(min)'], errors='coerce').fillna(0)
    df['عدد_الطبالي'] = pd.to_numeric(df['عدد_الطبالي'], errors='coerce').fillna(0)

    # Status Mapping (Categorization)
    def categorize_status(status):
        if 'Successful' in str(status): return 'ناجحة'
        if any(s in str(status) for s in ['Assigned', 'Accepted', 'Started', 'InProgress']): return 'نشطة'
        if any(s in str(status) for s in ['Failed', 'Declined', 'Cancelled']): return 'فاشلة'
        return 'أخرى'

    df['Status_Category'] = df['Task_Status'].apply(categorize_status)

    # 7. Sidebar Date Filter
    st.sidebar.subheader("الفلاتر الزمانية")
    min_date = df['Creation_DateTime'].min().date()
    max_date = df['Creation_DateTime'].max().date()
    date_filter = st.sidebar.date_input("اختر النطاق الزمني:", [min_date, max_date])

    if len(date_filter) == 2:
        df = df[(df['Creation_DateTime'].dt.date >= date_filter[0]) & (df['Creation_DateTime'].dt.date <= date_filter[1])]

    # 5. KPI Cards
    st.title("🚚 منصة تحليل بيانات التوصيل")
    
    total_orders = len(df)
    successful_orders = len(df[df['Status_Category'] == 'ناجحة'])
    failed_orders = len(df[df['Status_Category'] == 'فاشلة'])
    
    success_rate = (successful_orders / (successful_orders + failed_orders) * 100) if (successful_orders + failed_orders) > 0 else 0
    avg_time = df[df['Status_Category'] == 'ناجحة']['Total_Time_Taken(min)'].mean()
    total_distance = df['Distance(KM)'].sum()

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("إجمالي الطلبات", f"{total_orders}")
    col2.metric("الطلبات الناجحة", f"{successful_orders}")
    col3.metric("معدل النجاح", f"{success_rate:.1f}%")
    col4.metric("متوسط الوقت", f"{avg_time:.1f} دقيقة")
    col5.metric("إجمالي المسافات", f"{total_distance:.1f} كم")

    st.divider()

    # 6. Charts
    chart_col1, chart_col2 = st.columns(2)

    with chart_col1:
        st.subheader("📊 توزع حالات الطلبات")
        status_counts = df['Status_Category'].value_counts().reset_index()
        status_counts.columns = ['الحالة', 'العدد']
        fig_status = px.bar(status_counts, x='الحالة', y='العدد', color='الحالة', 
                           color_discrete_map={'ناجحة': '#10b981', 'نشطة': '#0ea5e9', 'فاشلة': '#f43f5e'})
        st.plotly_chart(fig_status, use_container_width=True)

    with chart_col2:
        st.subheader("🏆 أفضل 5 مناديب")
        top_agents = df[df['Status_Category'] == 'ناجحة']['Agent_Name'].value_counts().head(5).reset_index()
        top_agents.columns = ['المندوب', 'عدد الناجحة']
        fig_agents = px.bar(top_agents, x='المندوب', y='عدد الناجحة', text_auto=True)
        st.plotly_chart(fig_agents, use_container_width=True)

    st.subheader("🏬 توزيع ضغط العمل على المستودعات")
    team_counts = df['Team_Name'].value_counts().reset_index()
    team_counts.columns = ['المستودع', 'إجمالي الطلبات']
    fig_teams = px.bar(team_counts, x='المستودع', y='إجمالي الطلبات', color='إجمالي الطلبات')
    st.plotly_chart(fig_teams, use_container_width=True)

    # 8. Detailed Table
    st.subheader("📋 الجدول التفصيلي للعمليات")
    st.dataframe(df[['Creation_DateTime', 'Task_Status', 'Agent_Name', 'Team_Name', 'Distance(KM)', 'Total_Time_Taken(min)']], use_container_width=True)

else:
    st.info("👋 مرحباً بك! يرجى رفع ملف إكسل أو الربط المباشر من القائمة الجانبية لعرض التحليلات.")
